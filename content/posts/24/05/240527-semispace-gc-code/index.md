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
It's important to note that this root set contains the roots of the program at a given time.
Essentially, to simplify things so we can focus just on Cheney's algorithm here, we will just look at this set to determine what the roots of program are at it's current state.
As mentioned, this is a dramatic oversimplification, but it serves our purposes well enough.

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
Since later we'll calculate the size of the To Space based on the size of the From Space, this means that the To Space will also have $\left\lfloor\frac{size - 4}{2}\right\rfloor$ addresses, effectively pretending the very last address doesn't exist.

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

Ok, pause here for a moment.
Look at that function header I wrote: `collectGarbage(root1, root2)`.
Why did I specifically choose to provide two roots as arguments to the function?
Hint: it has to do with the types that we're storing.

Earlier, we specified that we have two types available to users: `flat`s and `cons`es.
We also defined `flat`s as single integers that reference nothing and `cons`es as pairs that reference two objects corresponding to their two pointers.
Also remember that the roots of the program are the objects that are immediately referenced by a program at its current state.
So, since `cons`es reference two objects, when we allocate memory and define a `cons`, we need to make sure that the two objects that the `cons` references stay alive after garbage collection.

In other words, suppose we have the following stored in memory:

| Address | Value |
|:---:|:---:|
| `0` | `flat` |
| `1` | `1` |
| `2` | `flat` |
| `3` | `2` |
| `4` | `flat` |
| `5` | `3` |
| `6` | |
| `7` | |
| `8` | |

And our only root at the moment in the `flat` with value `3` stored at address `4`.
If we were to allocate a `cons` referencing `0` and `2`, we need to make sure that the objects at `0` and `2` ALSO stay alive post-garbage collection.
Therefore, `0` and `2` effectively become roots at allocation.
We need to pass this information on to the collector.
Hence the two arguments: `collectGarbage(root1, root2)`.
Why do we only need two?
Well, because the maximum number of objects that could be referenced by an object we're allocating is two.
So, the maximum number of objects that effectively become roots (we'll call them pseudo-roots) at allocation is two.

Great!
Now that that's cleared up, we can move on to the next step: "iterating through the roots and copying them over."

Annnnnnd, let's pause here again.
We said that we effectively create up to two new pseudo-roots at allocation.
We need to know the addresses of the pseudo-roots after garbage collection in order to allow our object to reference them.
For example, if we have our `cons` referencing objects at addresses `0` and `2` and garbage collection moves those objects to addresses `20` and `22` respectively, then our `cons` now needs to reference the objects at addresses `20` and `22`.
Since we clear out the From Space after allocation and so remove all forwarding pointers, we need to return the new addresses of our two pseudo-roots.
So, we need to handle them separately.

First, let's consider what we should do if we don't have any pseudo-roots.
We'll represent this by setting the two pseudo-roots to `false` and just returning `false` for each, effectively ignoring them.

If we do have pseudo-roots to copy, we should copy them over and return the new addresses.
Fortunately for us, we wrote `copyFrom(pointer)` in such a way that it already returns the new address of whatever pointer we pass it.
So, our code becomes:

```js
...
collectGarbage(root1, root2) {
    ...
    let newRoot1 = false;
    let newRoot2 = false;

    ...
    
    if (root1 != false) {
        newRoot1 = this.copyFrom(root1);
        this.moveRoot(root1, newRoot1);
        ...
    }
    if (root2 != false) {
        newRoot2 = this.copyFrom(root2);
        this.moveRoot(root2, newRoot2);
        ...
    }
    ...
    
    return [newRoot1, newRoot2];
}
...
```

Ok, and now we just need to iterate through the roots in the root set, right?
Well, there's one caveat to that.
We should make sure that we don't accidentally copy roots over twice.
When might that happen?
When the pseudo-roots were actually real roots already in the root set.
If that's the case, we need to exclude those roots from the root set when we iterate through it.
Fortunately, this can be done with a basic set operation: set difference.
Once we get the difference of the two sets and know which roots to copy over, we just use our `copyFrom(pointer)` function to copy them and then update their locations in the root set.

```js
...
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
    
    ...
    
    return [newRoot1, newRoot2];
}
...
```

Once we've done that, there are only two steps left for this function:

1. Iterate through the To Space
2. Clean up collection

For iterating through the To Space, when do we know when we're done?
Well, remember back in the previous post, we said that this happens when the `free` and the `scan` pointers point to the same address.
This is because that means that the address of the next object in the in To Space who references we need to copy (the `scan` pointer) is the same address as the first empty space in the To Space (the `free` pointer).
In other words, the next object whose references we need to copy...doesn't exist!
We're done.
We can represent this with a simple `while` loop (and we'll fill in the `collectGarbageStep` function next):

```js
...
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

    ...
    
    return [newRoot1, newRoot2];
}
...
```

Lastly, we just need to clean up after garbage collection.
We'll abstract this away into a function and write this one later too.
And like that, the skeleton of our garbage collector is done!

```js
...
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
...
```

### Garbage Collection Steps

Now that we have our skeleton, we're getting close to being done with garbage collection.
Up next is implementing the code that we execute on each object in the To Space.
The steps here are incredibly simple:

1. Figure out what type of object is being stored at the current value of the `scan` pointer
2. If it references something, copy over what it references
3. Update our `scan` pointer

Let's get started!

Since this all relies on the object at the current value of the `scan` pointer, first we should get the `scan` pointer.
Then, just like in `copyFrom(pointer)`, we do a something different depending on what type of object is stored here:

```js
...
collectGarbageStep() {
    let scanPointer = this.heap.heapGet(2);
    let tag = this.heap.heapGet(scanPointer);
    switch(tag) {
        case "flat":
            ...
        case "cons":
            ...
        default:
            console.error(`Collector.collectGarbage: unknown tag: ${tag}`);
            return null;
    }
}
...
```

Note that we only need to consider `flat`s and `cons`es.
Why?
Because `forward`ing pointers can only exist in the From Space since they point from the From Space to the To Space.

The `flat` case is simpler, so we'll start with it.
If the object at the `scan` pointer is a `flat`, it doesn't reference anything.
Therefore, we don't need to copy anything.
Therefore, we just need to update the `scan` pointer.
Since `flat`s take up two addresses, we have to increment the `scan` pointer by 2:

```js
...
collectGarbageStep() {
    let scanPointer = this.heap.heapGet(2);
    let tag = this.heap.heapGet(scanPointer);
    switch(tag) {
        case "flat":
            this.heap.heapSet(2, scanPointer + 2);
            break;
        case "cons":
            ...
        default:
            console.error(`Collector.collectGarbage: unknown tag: ${tag}`);
            return null;
    }
}
...
```

The `cons` case is almost the same; it's only very barely different.
All we need to do differently is:

1. Copy each object referenced by the `cons` from the From Space into the To Space
2. Update the `cons`'s pointers to point to the new addresses of the objects it references
3. Bump the `scan` pointer by 3 and not 2

We can complete steps 1. and 2. in a single line of code for each reference because `copyFrom(pointer)` returns the new address of an object in the To Space.
So, the case becomes:

```js
...
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
...
```

And just like that, we're done with the garbage collection steps!

### Cleaning Up

We are so close to the finish line!
We just need to clean up the mess that we made when collecting garbage.
This isn't as scary as it might sound.
The basic outline is:

1. Empty out the old From Space
2. Swap the pointers to the From Space and the To Space
3. Set our new allocation pointer and max allocation pointer

Emptying out the old From Space is pretty easy.
We just need to know where it starts.
Fortunately, we have a pointer that tells us where it starts.
Finding where it ends takes a bit of math, but it's not too bad.
First, we need to figure out how much space the From Space takes up.
We calculated this when we instantiated the From Space pointer and the To Space pointer—we set the To Space pointer to be exactly after the end of the From Space.
Since the only change we make to the values of the Two Space pointer and the From Space pointer is swapping them, this means that they will always be the same distance apart.
This means that we can always get the absolute value of the difference between them and use that to determine how big they are.
Then, we just fill that space with `empty`:

```js
...
cleanUpCollection() {
    let oldFromPointer = this.heap.heapGet(0);
    let oldToPointer = this.heap.heapGet(1);
    
    let availableAllocationSpace = Math.abs(oldToPointer - oldFromPointer);

    this.heap.heapFill(oldFromPointer, oldFromPointer + availableAllocationSpace, "free");
    ...
}
...
```

Swapping the From Space pointer and the To Space pointer is even easier:

```js
...
cleanUpCollection() {
    let oldFromPointer = this.heap.heapGet(0);
    let oldToPointer = this.heap.heapGet(1);
    
    let availableAllocationSpace = Math.abs(oldToPointer - oldFromPointer);

    this.heap.heapFill(oldFromPointer, oldFromPointer + availableAllocationSpace, "free");
    
    this.heap.heapSet(0, oldToPointer);
    this.heap.heapSet(1, oldFromPointer);
    ...
}
...
```

Lastly, we just need to set our new allocation and max allocation pointers.
We actually have one of these already set.
Since the next available space in the new From Space is the same as the next available space in the old To Space when collecting garbage, this value is currently stored in both the `scan` and the `free` pointers.
So, to update the allocation pointer, we do nothing—we just leave it be.

Updating the max allocation pointer is only the smallest bit more difficult.
Since we know how much space we have for allocating and we know the start of the space we have for allocating (the start of the new From Space/old To Space), we just need to add those together:

```js
...
cleanUpCollection() {
    let oldFromPointer = this.heap.heapGet(0);
    let oldToPointer = this.heap.heapGet(1);
    
    let availableAllocationSpace = Math.abs(oldToPointer - oldFromPointer);

    this.heap.heapFill(oldFromPointer, oldFromPointer + availableAllocationSpace, "free");
    
    this.heap.heapSet(0, oldToPointer);
    this.heap.heapSet(1, oldFromPointer);

    this.heap.heapSet(3, oldToPointer + availableAllocationSpace);
}
...
```

And just like that, we're completely done with writing our garbage collection algorithm!

### Wrapping Up

We just wrote all of the code needed to implement Cheney's algorithm in code.
The only thing left for us to do is to write an allocation function; however, that's pretty easy too.
All we have to do is:

1. Check if there's enough memory available to allocate our object
2. If there is, allocate it and be done
3. If not, collect garbage
4. Try to allocate it again
5. If there's enough space, we're done
6. If not, throw an error

I'll leave this as an exercise for you all to try to implement.
If you run into trouble or want to see my implementation, check out the [full code here](https://github.com/ellifteria/cheneys-gc.js/blob/main/cheneys-gc.js).

## Conclusion

Almost 5,000 words later, we finally have Cheney's algorithm implemented.
If you want to try out the collector in the browser, check out [this page](../../06/240605-gc-playground/)!
I hope this little series helped you understand garbage collection!

### References and Further Reading

- Dimoulas, C., Findler, R., St. Amour, V., Northwestern University COMP_SCI 321 Programming Languages Lecture Material: [Garbage Collection Basics](https://users.cs.northwestern.edu/~stamourv/teaching/321-S19/12-gc-intro.pdf), [Mark and Sweep Garbage Collection](https://users.cs.northwestern.edu/~stamourv/teaching/321-S19/13-14-gc-mark-and-sweep.pdf), [Copying Garbage Collection](https://users.cs.northwestern.edu/~stamourv/teaching/321-S19/15a-gc-copying.pdf)
- Drakos, N., Moore, R., [CSE 5317/4305: Design and Construction of Compilers](https://lambda.uta.edu/cse5317/notes/node49.html) Section [13.2.2 Copying Garbage Collection](https://lambda.uta.edu/cse5317/notes/node48.html)
- Wilson, Paul R., [Uniprocessor Garbage Collection Techniques](https://3e8.org/pub/pdf-t1/gcsurvey.pdf)
