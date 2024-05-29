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

### Givens

To make life easier for ourselves, let's assume we already have some classes defined<label for="sidenote--sn1" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn1" class="margin-toggle"/><span class="sidenote">
They actually are already defined and can be found [here](https://github.com/ellifteria/cheneys-gc.js).
</span> defined.
First, we have a `Heap` class that provides the following methods:

1. `heapSet(address, value)`: Sets `address` in the heap to `value` if `address` is a valid address.
2. `heapGet(address)`: Returns the value stored in `address` if it is a valid address.
3. `heapFill(startAddress, endAddress, value)`: Fills all addresses between `startAddress` (inclusive) and `endAddress` (exclusive) with `value`.

Next, we have a `Collector` class to represent an abstract garbage collector.
The `Collector` class has the following methods that all throw `not yet implemented` errors and need to be filled in by a class inheriting from `Collector`<label for="sidenote--sn2" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn2" class="margin-toggle"/><span class="sidenote">
The `Collector` class also includes `addRoot(root)`, `removeRoot(root)`, and `moveRoot(oldRoot, newRoot)` methods that do have definitions; however, we won't use them here.
</span>:

1. `collectGarbage(root1, root2)`: This is the method we'll call to actually collect garbage.
2. `spaceExists(amount)`: This method should check if there's any space left in the heap or if we need to collect garbage.
3. `allocate(data, asRoot = false)`: Here is where we'll allocate memory—we won't fill this one in in this post.

```js
class TwoSpaceCopyingCollector extends Collector {
    constructor(size) {
        super();

        if (!isInteger(size) || size <= 6) {
            console.error(`new Collector: illegal size: ${size}`);
            return null;
        }

        this.size = size
        this.heap = new Heap(this.size);
        let fromPointer = 4;
        let toPointer = integerDivision(size - 4, 2) + 4;
        this.heap.heapFill(0, this.size, "free");
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
    };
    
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
        
        if (root1 != false) {
            newRoot1 = this.copyFrom(root1);
            this.moveRoot(root1, newRoot1);
        }
        if (root2 != false) {
            newRoot2 = this.copyFrom(root2);
            this.moveRoot(root2, newRoot2);
        }

        let currentRoots = this.roots.values().toArray();
        for (const root of currentRoots) {
            let newRoot = this.copyFrom(root);
            this.moveRoot(root, newRoot);
        }
        
        while (this.heap.heapGet(2) < this.heap.heapGet(3)) {
            this.collectGarbageStep();
        }

        this.cleanUpCollection();
        
        return [newRoot1, newRoot2];
    };
    
    cleanUpCollection() {
        let oldFromPointer = this.heap.heapGet(0);
        let oldToPointer = this.heap.heapGet(1);
        
        let endOfMemory = integerDivision(this.size - 4, 2) + oldFromPointer;
        this.heap.heapFill(oldFromPointer, endOfMemory, "free");
        
        this.heap.heapSet(0, oldToPointer);
        this.heap.heapSet(1, oldFromPointer);
        
        if (oldToPointer >= oldFromPointer) {
            this.heap.heapSet(3, this.size);
        } else {
            this.heap.heapSet(3, oldFromPointer);
        }
    };
    
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
    };
}
```
