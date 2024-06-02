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

## Cheney's Algorithm in JavaScript

### Provided Classes and Functions

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

And with all of these, we're ready to start implementing Cheney's algorithm!

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
