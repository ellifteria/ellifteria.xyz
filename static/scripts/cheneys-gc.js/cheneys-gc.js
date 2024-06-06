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
