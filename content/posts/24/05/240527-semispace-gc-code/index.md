---
title: Semi-Space Garbage Collection Part 2
summary: A Deep Dive into Implementing a Two-Space Copying Garbage Collector
template: page
path:
    -   name: Posts
        link: /posts
    -   name: Semi-Space Garbage Collection Part 2
        link: /posts/24/05/240527-semispace-gc-code
        self: true
series:
    name: Garbage Collection
    link: /posts/series/gc
---

[Last time](../240523-semispace-gc), we covered how semi-space garbage collection works using Cheney's algorithm.
Let's finally write some code!

***NOTE:*** This post builds upon the [last one](../240523-semispace-gc/).
You'll need to read the previous post to be able to understand some of the terminology used in this one.
If you haven't read it yet, go check it out and then come back.
It'll still be here, I promise<label for="sidenote--sn0" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn" class="margin-toggle"/><span class="sidenote">
Unless something catastrophic happens or I lose this domain.
</span>

## Cheney's Algorithm in JavaScript

### Provided Classes and Functions

Let's get some boring helper functions out of the way.
To make life easier for ourselves, let's assume we already have some classes defined<label for="sidenote--sn1" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn1" class="margin-toggle"/><span class="sidenote">
They actually are already defined and can be found [here](https://github.com/ellifteria/cheneys-gc.js/blob/main/GCLib.js).
</span> defined.
First, we have a `Heap` class that provides the following methods:

1. `heapSet(address, value)`: Sets `address` in the heap to `value` if `address` is a valid address.
2. `heapGet(address)`: Returns the value stored in `address` if it is a valid address.
3. `heapFill(startAddress, endAddress, value)`: Fills all addresses between `startAddress` (inclusive) and `endAddress` (exclusive) with `value`.

Next, we have a `Collector` class to represent an abstract garbage collector.
The `Collector` class has the following methods that all throw `not yet implemented` errors and need to be filled in by a class inheriting from `Collector`

1. `collectGarbage(root1, root2)`: This is the method we'll call to actually collect garbage.
2. `spaceExists(amount)`: This method should check if there's any space left in the heap or if we need to collect garbage.
3. `allocate(data, asRoot = false)`: Here is where we'll allocate memory.

It also contains the following methods that do have definitions:<label for="sidenote--sn2" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn2" class="margin-toggle"/><span class="sidenote">
In our collector, we will be manually adding and removing roots. This is a very simplified way of thinking about program roots and is NOT how you would want to implement it in an actual programming language. We just do this here for simplicity's sake.
</span>:

1. `addRoot(root)`: Adds a new root to the collector's current root set.
2. `removeRoot(root)`: Removes a root from the collector's root set
3. `moveRoot(oldRoot, newRoot)`: Removes a root from the collector's root set and adds the new root.

The `Collector` class also has a `constructor` that instantiates the root set.

Lastly, we have functions defined for integer division and checking if a value is an integer: `integerDivision(a, b)` which returns $\left\lfloor \frac{a}{b} \right\rfloor$ and `isInteger(maybeInteger)` which returns whether or not `maybeInteger` is an integer.

While I'm sure you could write more helper functions, these provide all the abstractions we need to start implementing Cheney's algorithm.

### Memory Layout

Before we start implementing garbage collection, we need to know how memory is being stored in the first place.
For ease and for better memory locality, we'll make both the From Space and the To Space two continuous chunks of memory.
Then, we'll set aside a small amount of memory for storing any pointers we need.

More importantly, we need to figure out how we store each individual object in memory.
And for that, we need to figure out exactly what types of objects we'll be storing.

To make things easy for ourselves, we'll only store two different types of objects (just like in the previous post):

1. Flat values, which will be a single integer
2. Pairs of two different pointers

And just like in the previous post, since each of these types of objects has a different size, we need to annotate each object with their type so our garbage collector knows how to treat them.
So, just like last time, we'll store each object in multiple addresses.
In the first, we'll store the type of the object.
And the value—or values—of the object will be stored in addresses directly after it.

So the integer 10 would be stored in memory with two addresses as:

| Address Offset | Value |
|:---:|:---:|
| `0` | `flat` |
| `1` | `10` |

And a pair with pointers to addresses `12` and `18` would be stored in memory with three addresses as:

| Address Offset | Value |
|:---:|:---:|
| `0` | `cons` |
| `1` | `12` |
| `2` | `18` |

We actually have one more type of object that can be stored in memory, but it's not one that users are able to define.
We'll need to store our forwarding pointers in memory too.
Since these are just a single pointer value, we'll again store them in two memory addresses as:

| Address Offset | Value |
|:---:|:---:|
| `0` | `forward` |
| `1` | address |

And now, we're finally ready to start implementing Cheney's algorithm!

### Instantiating the Collector

Let's start with the simplest part of the code:
instantiating the garbage collector.

Here, we have a couple of tasks.
We need to

1. Create a `Heap` of memory
2. Set up any variables we need to allocate memory and collect garbage

The first part is relatively simple and just relies on calling `new Heap(size)`.
This means that we need to get a size of our heap from whomever is instantiating the collector.
And if that's the case, we need to validate that the given `size` is a legal value.

That brings up our first question:
what sizes can we NOT have for our garbage collector?

To answer that, we need to think about how much memory our collector will 100% absolutely need.
Since we need to be able to allocate *some* memory, we can first say that `size` has to be greater than or equal to 1.
However, we also need to be able to copy memory from the From Space to the To Space.
As noted [earlier](../240523-semispace-gc/), we need to have the same amount of space in the From Space and the To Space, so now we need `size` to be at least 2.

Pause for a second here to think.
Is there any more memory we need?

Yes, there is.
In our last post, we mentioned that we needed to keep track of two pointers we called the `free` and the `scan` pointers.
These kept track of where we were in memory when collecting garbage.
We'll also keep track of two more pointers: one to the start of the To Space and one to the start of the From Space.
This brings us up to four pointers.
Since we also needed to have room for at least one thing in both the To Space and the From Space, we'll add $4 + 2 = 6$ and say that we need `size` to be at least 6<label for="sidenote--sn3" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn3" class="margin-toggle"/><span class="sidenote">
For reasons that will become obvious later, 6 is actually too small to be able to allocate anything. This is because we'll need at least 2 address available for every piece of memory to store the object and the type of the object. You could choose to make `size` at least 8 if you want. We just absolutely need it to be at least 6 so we have separate addresses for the start of the To Space and the From Space.
</span>.

So, the first thing we should do is to check that `size` is valid and then instantiate our heap<label for="sidenote--sn4" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn4" class="margin-toggle"/><span class="sidenote">
(after calling the `super` constructor, of course)
</span>!

```js
constructor(size) {
    super();

    if (!isInteger(size) || size <= 6) {
        console.error(`new Collector: illegal size: ${size}`);
        return null;
    }

    this.heap = new Heap(size);
    this.heap.healFill(0, size, "free"); // fill heap with empty memory

    ...
```

Ok, what's next?
We need to instantiate our four pointers.
First, we need to figure out where our From Space and To Space start.
The space available for memory is all the space after our pointers.
So we have $size - 4$ addresses available which means each the From Space and the To Space get $\frac{size - 4}{2}$ addresses.
We'll have the From Space start directly after the To Space: address 4.
That means that the To Space starts at $4 + \frac{size - 4}{2}$, right?
Yes...
...unless we have an odd size.
In that case, if we divided the space evenly, one of the From and the To Space will be "smaller" than the other.
However, we know that won't work.
So, what should we do?

The solution:
ignore the single address that's making the size of the heap odd.
How do we do this mathematically?
Give the From Space and the To Space each $\left\lfloor\frac{size - 4}{2}\right\rfloor$ addresses.
So, we start the To Space at $4 + \left\lfloor\frac{size - 4}{2}\right\rfloor$.
Since later we'll calculate the size of the To Space based on the size of the From Space, this means that the To Space will also have $\left\lfloor\frac{size - 4}{2}\right\rfloor$ addresses.

```js
constructor(size) {
    ...

    let fromPointer = 4;
    let toPointer = integerDivision(size - 4, 2) + 4;

    ...
```

We need to store the values of these pointers in our heap so we can access them later.
We'll store them in this order (at addresses 0–3 in our heap):

1. Pointer to the start of the From Space
2. Pointer to the start of the To Space
3. Allocation pointer (when not collecting garbage)/scan pointer (when collecting garbage)
4. MaxAllocation pointe (when not collecting garbage)/free pointer (when collecting garbage)

We need to initialize these to:

1. the pointer to the start of the From Space
2. the pointer to the start of the To Space
3. the pointer to the start of the From Space
4. the pointer to the start of the To Space

```js
constructor(size) {
    ...

    this.heap.heapSet(0, fromPointer);
    this.heap.heapSet(1, toPointer);
    this.heap.heapSet(2, fromPointer);
    this.heap.heapSet(3, toPointer);
}
```

This completes our constructor!

```js
constructor(size) {
    super();

    if (!isInteger(size) || size <= 6) {
        console.error(`new Collector: illegal size: ${size}`);
        return null;
    }

    this.heap = new Heap(size);
    this.heap.heapFill(0, size, "free");

    let fromPointer = 4;
    let toPointer = integerDivision(size - 4, 2) + 4;
    
    this.heap.heapSet(0, fromPointer);
    this.heap.heapSet(1, toPointer);
    this.heap.heapSet(2, fromPointer);
    this.heap.heapSet(3, toPointer);
}
```

### Copying from the From Space to the To Space

Now we can move on to writing the garbage collection algorithm.
As a reminder, an very very very high-level outline of the steps we need to take is:

1. Iterate through roots and copy them from the From Space into the To Space
2. Iterate through memory in the To Space, copying memory referenced by each object from the From Space into the To Space

Both of those involve copying memory from the From Space to the To Space, so let's go ahead and write a method for that.

There are a few steps that our `copyFrom(pointer)` function will need to complete:

1. Figure out what object is being stored at `pointer`
2. Move that memory into the first available address in the To Space
3. Leave a forwarding pointer where the object used to be in the From Space that points to the address we just moved to object to in the To Space
4. Update the first available address in the To Space
5. Return the new address of the object (i.e., the location we just moved it to in the To Space)

Getting started with our function, we'll need the address of the first available space in the To Space to be able to copy memory into it.
Fortunately, we have that value saved in our `free` pointer stored at address 3 in our heap.

```js
...
copyFrom(pointer) {
    let freePointer = this.heap.heapGet(3);
    ...
```

Next, we need to figure out what type of object we're copying from the From Space.
As we mentioned earlier, we have the type of the object stored at the first address an object takes up.
We'll call this the object's `tag`.
The `tag` can take one of three values:

1. `flat`
2. `cons`
3. `forward`

We'll need to handle each differently.

```js
...
copyFrom(pointer) {
    ...
    let tag = this.heap.heapGet(pointer);
    switch(tag) {
        case "forward":
            //handle forwarding pointer
        case "flat":
            // handle flat value
        case "cons":
            // handle pair of pointers
        default:
                console.error(`Collector.copyFrom: unknown tag: ${this.heap.heapGet(pointer)}`);
                return null;
    }
    ...
```

Forwarding pointers are the easiest of the three, so we'll start there.
Unlike with `flat`s and `cons`es, `forward`ing pointers don't require us to copy over anything into the To Space.
They also don't require that we leave a `forward`ing pointer in their place because, well, they're already a `forward`ing pointer.
Looking at the steps we laid out, this means that all we have to do is step 5. "Return the new address of the object."
Fortunately, this is easy.
The new address of the object is just the address that the `forward`ing pointer points to—we just need to return that.

```js
...
copyFrom(pointer) {
    ...
    let tag = this.heap.heapGet(pointer);
    switch(tag) {
        case "forward":
            return this.heap.heapGet(pointer + 1);
        case "flat":
            // handle flat value
        case "cons":
            // handle pair of pointers
        default:
                console.error(`Collector.copyFrom: unknown tag: ${this.heap.heapGet(pointer)}`);
                return null;
    }
    ...
```

The second easiest to handle are `flat`s since they only have one value to copy over.
However, like `cons`es and unlike `forward`ing pointers, `flat`s do require that we actually copy the object over from the From Space to the To Space and leave a `forward`ing pointer.
So, let's do just that.
Copying over the value from the From Space to the To Space is relatively easy:

```js
...
copyFrom(pointer) {
    ...
    let tag = this.heap.heapGet(pointer);
    switch(tag) {
        case "forward":
            return this.heap.heapGet(pointer + 1);
        case "flat":
            this.heap.heapSet(freePointer, "flat"); // set the next available address in the To Space to the tag `flat`
            this.heap.heapSet(freePointer + 1, this.heap.heapGet(pointer + 1)); // set the next available address after that to the value of this flat
            ...
        case "cons":
            // handle pair of pointers
        default:
                console.error(`Collector.copyFrom: unknown tag: ${this.heap.heapGet(pointer)}`);
                return null;
    }
    ...
```

After that, we need to leave a `forward`ing pointer in the place of the object in the From Space so that other objects that reference it can still locate it:

```js
...
copyFrom(pointer) {
    ...
    let tag = this.heap.heapGet(pointer);
    switch(tag) {
        case "forward":
            return this.heap.heapGet(pointer + 1);
        case "flat":
            this.heap.heapSet(freePointer, "flat");
            this.heap.heapSet(freePointer + 1, this.heap.heapGet(pointer + 1));
            this.heap.heapSet(pointer, "forward");
            this.heap.heapSet(pointer + 1, freePointer); // the new address of the object is stored in the `free` pointer
            ...
        case "cons":
            // handle pair of pointers
        default:
                console.error(`Collector.copyFrom: unknown tag: ${this.heap.heapGet(pointer)}`);
                return null;
    }
    ...
```

Lastly, we need to update the `free` pointer.
Since `flat`s take up 2 spaces in memory, we just need to increment it by 2:

```js
...
copyFrom(pointer) {
    ...
    let tag = this.heap.heapGet(pointer);
    switch(tag) {
        case "forward":
            return this.heap.heapGet(pointer + 1);
        case "flat":
            this.heap.heapSet(freePointer, "flat");
            this.heap.heapSet(freePointer + 1, this.heap.heapGet(pointer + 1));
            this.heap.heapSet(pointer, "forward");
            this.heap.heapSet(pointer + 1, freePointer);
            this.heap.heapSet(3, freePointer + 2);
            break;
        case "cons":
            // handle pair of pointers
        default:
                console.error(`Collector.copyFrom: unknown tag: ${this.heap.heapGet(pointer)}`);
                return null;
    }
    ...
```

And now we're done with handling `flat`s!
Fortunately, handling `cons`es is the exact same idea.
All we have to do differently is copy two values—since there are two pointers in a `cons`—and increment the `free` pointer by 3 instead of by 2:

```js
...
copyFrom(pointer) {
    ...
    let tag = this.heap.heapGet(pointer);
    switch(tag) {
        case "forward":
            return this.heap.heapGet(pointer + 1);
        case "flat":
            this.heap.heapSet(freePointer, "flat");
            this.heap.heapSet(freePointer + 1, this.heap.heapGet(pointer + 1));
            this.heap.heapSet(pointer, "forward");
            this.heap.heapSet(pointer + 1, freePointer);
            this.heap.heapSet(3, freePointer + 2);
            break;
        case "cons":
            this.heap.heapSet(freePointer, "cons");
            this.heap.heapSet(freePointer + 1, this.heap.heapGet(pointer + 1));
            this.heap.heapSet(freePointer + 2, this.heap.heapGet(pointer + 2));
            this.heap.heapSet(pointer, "forward");
            this.heap.heapSet(pointer + 1, freePointer);
            this.heap.heapSet(3, freePointer + 3);
            break;
        default:
                console.error(`Collector.copyFrom: unknown tag: ${this.heap.heapGet(pointer)}`);
                return null;
    }
    ...
```

To finish up this function, we just need to return the new address of the object.

```js
...
copyFrom(pointer) {
    let freePointer = this.heap.heapGet(3);
    let tag = this.heap.heapGet(pointer);
    switch(tag) {
        case "forward":
            return this.heap.heapGet(pointer + 1);
        case "flat":
            this.heap.heapSet(freePointer, "flat");
            this.heap.heapSet(freePointer + 1, this.heap.heapGet(pointer + 1));
            this.heap.heapSet(pointer, "forward");
            this.heap.heapSet(pointer + 1, freePointer);
            this.heap.heapSet(3, freePointer + 2);
            break;
        case "cons":
            this.heap.heapSet(freePointer, "cons");
            this.heap.heapSet(freePointer + 1, this.heap.heapGet(pointer + 1));
            this.heap.heapSet(freePointer + 2, this.heap.heapGet(pointer + 2));
            this.heap.heapSet(pointer, "forward");
            this.heap.heapSet(pointer + 1, freePointer);
            this.heap.heapSet(3, freePointer + 3);
            break;
        default:
            console.error(`Collector.copyFrom: unknown tag: ${this.heap.heapGet(pointer)}`);
            return null;
    }
    return freePointer;
}
...
```

### Actually Collecting Garbage

Now that we have a function to copy memory from the From Space into the To Space, let's start collecting garbage.
This garbage collection function will do the following:

1. Iterate through the roots of the current state of the program in order. For each:
    1. Copy the root from the From Space into the first available space in the To Space.
    2. Replace the memory location in the From Space originally inhabited by the root with a forwarding pointer pointing to its new location in the To Space.
2. Iterate through the objects in the To Space in order. For each, call a function that will handle whatever object we comes across.
3. Clean up the aftermath of garbage collection.

How do we start?
Remember earlier when we described the four pointers we were storing in our heap?
Two of those were serving two different purposes when we're allocating data and when we're collecting garbage.
So we should start by initializing those pointers to their garbage collection versions.
This means setting both the `free` and `scan` pointers to the start of the To Space, which we also have stored as a pointer:

```js
...
collectGarbage(root1, root2) {
    this.heap.heapSet(2, this.heap.heapGet(1));
    this.heap.heapSet(3, this.heap.heapGet(1));
    ...
```

```js
class TwoSpaceCopyingCollector extends Collector {
    constructor(size) {
        super();

        if (!isInteger(size) || size <= 6) {
            console.error(`new Collector: illegal size: ${size}`);
            return null;
        }

        this.heap = new Heap(size);
        let fromPointer = 4;
        let toPointer = integerDivision(size - 4, 2) + 4;
        this.heap.heapFill(0, size, "free");
        this.heap.heapSet(0, fromPointer);
        this.heap.heapSet(1, toPointer);
        this.heap.heapSet(2, fromPointer);
        this.heap.heapSet(3, toPointer);

    }
    
    copyFrom(pointer) {
        let freePointer = this.heap.heapGet(3);
        switch(this.heap.heapGet(pointer)) {
            case "forward":
                return this.heap.heapGet(pointer + 1);
            case "flat":
                this.heap.heapSet(freePointer, "flat");
                this.heap.heapSet(freePointer + 1, this.heap.heapGet(pointer + 1));
                this.heap.heapSet(pointer, "forward");
                this.heap.heapSet(pointer + 1, freePointer);
                this.heap.heapSet(3, freePointer + 2);
                break;
            case "cons":
                this.heap.heapSet(freePointer, "cons");
                this.heap.heapSet(freePointer + 1, this.heap.heapGet(pointer + 1));
                this.heap.heapSet(freePointer + 2, this.heap.heapGet(pointer + 2));
                this.heap.heapSet(pointer, "forward");
                this.heap.heapSet(pointer + 1, freePointer);
                this.heap.heapSet(3, freePointer + 3);
                break;
            default:
                console.error(`Collector.copyFrom: unknown tag: ${this.heap.heapGet(pointer)}`);
                return null;
        }
        return freePointer;
    }
    
    collectGarbageStep() {
        let scanPointer = this.heap.heapGet(2);
        let tag = this.heap.heapGet(scanPointer);
        switch(tag) {
            case "flat":
                this.heap.heapSet(2, scanPointer + 2);
                break;
            case "cons":
                this.heap.heapSet(scanPointer + 1, this.copyFrom(this.heap.heapGet(scanPointer + 1)));
                this.heap.heapSet(scanPointer + 2, this.copyFrom(this.heap.heapGet(scanPointer + 2)));
                this.heap.heapSet(2, scanPointer + 3);
                break;
            default:
                console.error(`Collector.collectGarbage: unknown tag: ${tag}`);
                return null;
        }
    }
    
    collectGarbage(root1, root2) {
        this.heap.heapSet(2, this.heap.heapGet(1));
        this.heap.heapSet(3, this.heap.heapGet(1));
        
        let newRoot1 = false;
        let newRoot2 = false;

        let newRoots = new Set();
        
        if (root1 != false) {
            newRoot1 = this.copyFrom(root1);
            this.moveRoot(root1, newRoot1);
            newRoots.add(root1);
        }
        if (root2 != false) {
            newRoot2 = this.copyFrom(root2);
            this.moveRoot(root2, newRoot2);
            newRoots.add(root2);
        }

        let currentRoots = this.roots.difference(newRoots).values().toArray();
        for (const root of currentRoots) {
            let newRoot = this.copyFrom(root);
            this.moveRoot(root, newRoot);
        }
        
        while (this.heap.heapGet(2) < this.heap.heapGet(3)) {
            this.collectGarbageStep();
        }

        this.cleanUpCollection();
        
        return [newRoot1, newRoot2];
    }
    
    cleanUpCollection() {
        let oldFromPointer = this.heap.heapGet(0);
        let oldToPointer = this.heap.heapGet(1);
        
        let availableAllocationSpace = Math.abs(oldToPointer - oldFromPointer);

        this.heap.heapFill(oldFromPointer, oldFromPointer + availableAllocationSpace, "free");
        
        this.heap.heapSet(0, oldToPointer);
        this.heap.heapSet(1, oldFromPointer);
        
        if (oldToPointer >= oldFromPointer) {
            this.heap.heapSet(3, (oldFromPointer - 4) * 2 + 4);
        } else {
            this.heap.heapSet(3, oldFromPointer);
        }
    }
    
    spaceExists(amount) {
        return this.heap.heapGet(3) >= (this.heap.heapGet(2) + amount);
    }
    
    allocate(data, asRoot = false) {
        let allocationPointer = this.heap.heapGet(2);
        
        switch (data.tag) {
            case "flat":
                if (this.spaceExists(2)) {
                    this.heap.heapSet(allocationPointer, "flat");
                    this.heap.heapSet(allocationPointer + 1, data.value);
                    this.heap.heapSet(2, allocationPointer + 2);
                    if (asRoot) {
                        this.addRoot(allocationPointer);
                    }
                } else {
                    this.collectGarbage(false, false);
                    if (this.spaceExists(2)) {
                        allocationPointer = this.heap.heapGet(2);
                        this.heap.heapSet(allocationPointer, "flat");
                        this.heap.heapSet(allocationPointer + 1, data.value);
                        this.heap.heapSet(2, allocationPointer + 2);
                        if (asRoot) {
                            this.addRoot(allocationPointer);
                        }
                    } else {
                        console.error(`Collector.allocate: out of memory in allocating: (flat ${data.value})`);
                        return null;
                    }
                }
                break;
            case "cons":
                if (this.spaceExists(3)) {
                    this.heap.heapSet(allocationPointer, "cons");
                    this.heap.heapSet(allocationPointer + 1, data.root1);
                    this.heap.heapSet(allocationPointer + 2, data.root2);
                    this.heap.heapSet(2, allocationPointer + 3);
                    if (asRoot) {
                        this.addRoot(allocationPointer);
                    }
                } else {
                    let [newRoot1, newRoot2] = this.collectGarbage(data.root1, data.root2);
                    if (this.spaceExists(3)) {
                        allocationPointer = this.heap.heapGet(2);
                        this.heap.heapSet(allocationPointer, "cons");
                        this.heap.heapSet(allocationPointer + 1, newRoot1);
                        this.heap.heapSet(allocationPointer + 1, newRoot2);
                        this.heap.heapSet(2, allocationPointer + 3);
                        if (asRoot) {
                            this.addRoot(allocationPointer);
                        }
                    } else {
                        console.error(`Collector.allocate: out of memory in allocating: (cons ${data.root1} ${data.root2})`);
                        return null;
                    }
                }
                break;
            default:
                console.error(`Collector.allocate: unknown tag: ${tag}`);
                return null;
        }

        return allocationPointer;
    }
}
```
