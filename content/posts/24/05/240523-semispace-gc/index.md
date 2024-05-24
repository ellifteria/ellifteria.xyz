---
title: Semi-Space Garbage Collection
summary: A Deep Dive into Implementing a Two-Space Copying Garbage Collector
template: page
path:
    -   name: Posts
        link: /posts
    -   name: Semi-Space Garbage Collection
        link: /posts/24/05/240523-semispace-gc
        self: true
series:
    name: Garbage Collection
    link: /posts/series/gc
---

### What is Semi-Space Garbage Collection?

Two space copying garbage collection is a stop and copy method of tracing garbage collection.
This means that, in two space copying garbage collection, the garbage collector traces which objects are being used by a program by building a chain of referenced objects from some initial objects, called roots, and stops program execution to copy all memory still in use while discarding unused objects.
As a concrete example, suppose at some time, the following is stored by a program in memory and suppose that our roots are addresses `0`, `5`, and `7`.:

| Address | Value | Type | Root? |
|:---:|:---:|:---:|:---:|
| `0` | `1` | Pointer | Yes |
| `1` | `9` | Int | No |
| `2` | `40` | Int | No |
| `3` | `A` | Char | No |
| `4` | `3` | Pointer | No |
| `5` | `6` | Pointer | Yes |
| `6` | `2` | Pointer | No |
| `7` | `1` | Int | Yes |

Since `0`, `5`, and `7` are roots, they all are still alive—i.e., they are still being used.
Therefore, our garbage collector needs to copy these values.
The values at `0` and `5` are pointers; since they are alive, the objects they point to are also still alive.
So, addresses `1` and `6` need to be copied also.
Since the value at `6` is again a pointer, what it points to ALSO needs to be copied.
In the end, this means that memory at addresses `0`, `1`, `2`, `5`, and `7` all needs to be alive after garbage collection.
To find these memory addresses that need to be kept, a tracing garbage collector would build a chain of references starting form the roots just like this.
A stop and copy garbage collector would let the program execute until running out of memory, then stop execution, trace reference from the roots to find all alive memory, copy the alive memory, and discard all un-copied memory.
Two space copying collection is one method of doing so.

To do this, a two space copying garbage collector splits the heap up into two equal parts: a From Space and a To Space.
During normal program execution, the garbage collector allocates memory into the From Space only—nothing is allocated into the To Space.
This means that only the From Space can be used for allocating memory and that the heap fills up when the From Space is full.

When this happens, the garbage collector beings collecting garbage.
Tracing references through the From Space from the roots, the collector moves all alive memory into the To Space, leaving only garbage left in the From Space.
Then, the collector empties everything in the From Space.
The old From Space (which is not empty) becomes the new To Space and the old To Space (which has all alive objects) becomes the new From Space.
Then, program execution continues.

## What are Some of the Benefits of Two Space Copying Garbage Collection

1. No memory fragmentation
2. Collection time is proportional to the amount of live data (i.e., data that is not garbage)
3. Allocation only requires incrementing a pointer
4. Collection does not require much state

## What are Some of the Drawbacks to Two Space Copying Garbage Collection

1. Only half of the heap is able to be used for storing objects since the other half is needed for collection
2. Requires the entire program to stop executing to collect garbage

## How Does Two Space Copying Garbage Collection Work

Writing **THE ALGORITHM**

### General steps

1. Copy all program `root`s from the From Space into the beginning of the To Space leaving `forwarding pointer`s in the `root`s' places in the From Space
2. Iterate through To Space, copying all objects in the From Space referenced by objects in the To Space into the To Space, leaving `forwarding pointer`s in their places in the From Space

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
