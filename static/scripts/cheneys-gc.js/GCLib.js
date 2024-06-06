function isNumber(maybeNumber) {
    return typeof(maybeNumber) === 'number';
}

function isInteger(maybeInteger) {
    return isNumber(maybeInteger) && maybeInteger === Math.floor(maybeInteger);
}

class Heap {
    constructor(size) {
        if (!isInteger(size) || size < 0) {
            console.error(`new Heap: illegal size: ${size}`);
            return null;
        }

        this.size = size;
        this.data = new Array(size);
    }
    
    heapSet(address, value) {
        if (!isInteger(address) || address >= this.size || address < 0) {
            console.error(`Heap.heapSet: illegal location: ${address}`);
            return null;
        }

        this.data[address] = value;
    };

    heapGet(address) {
        if (!isInteger(address) || address >= this.size || address < 0) {
            console.error(`Heap.heapGet: illegal location: ${address}`);
            return null;
        }

        return this.data[address];
    };


    heapFill(startAddress, endAddress, value) {
        for (let i = startAddress; i < endAddress; i++) {
            this.heapSet(i, value);
        }
    };
}

function floorIntegerDivision(a, b) {
    if (!isNumber(a) || !isNumber(b)) {
        console.error(`integerDivision: illegal non-number argument: ${a}, ${b}`);
        return null;
    }
    if (b == 0) {
        console.error(`integerDivision: illegal divide by zero: ${b}`);
        return null;
    }
    
    return Math.floor(a / b);
}

function integerDivision(a, b) {
    if (a < 0 || b < 0) {
        console.error(`integerDivision: illegal negative argument: ${a}, ${b}`);
        return null;
    }
    
    return floorIntegerDivision(a, b);
}

class Collector {
    constructor() {
        this.roots = new Set();
    }

    collectGarbage(root1, root2) {
        console.error("Error in Collector.collectGarbage: not yet implemented");
        return null;
    };

    spaceExists(amount) {
        console.error("Error in Collector.spaceExists: not yet implemented");
        return null;
    }

    allocate(data, asRoot = false) {
        console.error("Error in Collector.allocate: not yet implemented");
        return null;
    };

    addRoot(root) {
        this.roots.add(root);
    }

    removeRoot(root) {
        this.roots.delete(root);
    }

    moveRoot(oldRoot, newRoot) {
        this.removeRoot(oldRoot);
        this.addRoot(newRoot);
    }
}
