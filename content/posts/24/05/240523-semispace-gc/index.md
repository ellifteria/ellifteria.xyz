---
title: Semi-Space Garbage Collection Part 1
summary: A Deep Dive into Implementing a Two-Space Copying Garbage Collector
template: page
path:
    -   name: Posts
        link: /posts
    -   name: Semi-Space Garbage Collection Part 1
        link: /posts/24/05/240523-semispace-gc
        self: true
series:
    name: Garbage Collection
    link: /posts/series/gc
---

In an [earlier post](../240522-gc/), I talked about garbage collection in general<label for="sidenote--sn1" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn1" class="margin-toggle"/><span class="sidenote">
...and about modeling garbage collection mathematically in [another](../240523-gc-math/)...
</span>.
Here, I want to dive deep into a specific garbage collection method and give a concrete example of implementing it.
The method: semi-space garbage collection.

## What is Semi-Space Garbage Collection?

Semi-space garbage collection (or two-space copying garbage collection) involves dividing the available memory in half: half is used for normal allocation and half is used for garbage collection<label for="sidenote--sn2" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn2" class="margin-toggle"/><span class="sidenote">
The specific algorithm I'll be covering is [Chenery's algorithm](https://dl.acm.org/doi/10.1145/362790.362798).
</span>.
Two-space copying garbage collection is a stop and copy method of tracing garbage collection.
This means that, in two-space copying garbage collection, the garbage collector traces which objects are being used by a program by building a chain of referenced objects from some initial objects, called roots, and stops program execution to copy all memory still in use while discarding unused objects.
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
Two-space copying collection is one method of doing so.

To do this, a two-space copying garbage collector splits the heap up into two equal parts: a From Space and a To Space.
During normal program execution, the garbage collector allocates memory into the From Space only—nothing is allocated into the To Space.
This means that only the From Space can be used for allocating memory and that the heap fills up when the From Space is full.

When this happens, the garbage collector beings collecting garbage.
Tracing references through the From Space from the roots, the collector moves all alive memory into the To Space, leaving only garbage left in the From Space.
Then, the collector empties everything in the From Space.
The old From Space (which is now empty) becomes the new To Space and the old To Space (which has all alive objects) becomes the new From Space.
Then, program execution continues.

## Pros and Cons of Two-Space Copying Garbage Collection

Why might someone choose to use a two-space copying garbage collection?
Well, it does have few benefits:

1. **No memory fragmentation.** Unlike strategies like mark and sweep which leave live objects in the same memory locations they were in before garbage collection, two-space copying collection moves all live objects close together, preventing memory fragmentation. In two-space copying collection, live objects post-collection are all at the start of the old To Space/ new From Space.
2. **Collection time is proportional to the amount of live data.** Two-space copying garbage collection only requires traversing the chains of live objects and live pointers, instead of iterating through all memory.
3. **Allocation only requires incrementing a pointer.** Allocation only requires storing an object in the next available memory location and then incrementing the pointer storing the location of the next available memory location.
4. **Collection does not require much state.** Collecting garbage will only require 4 extra garbage collection variables (we'll show this soon).

## What are Some of the Drawbacks to Two-Space Copying Garbage Collection

That being said, it does have some downsides:

1. **Only half of the heap is able to be used for storing objects since the other half is needed for collection.** Since we need to have heap space open for copying live objects during collection, we can't use the entire heap to store data. In fact, since theoretically all objects could still be live when collecting garbage, we need the same amount of space available in both the From Space and To Space. So, we can only use half the heap when allocating data.
2. **Requires the entire program to stop executing to collect garbage.** Like other stop-the-world methods, program execution has to completely stop while garbage is collected.

## How Does Two-Space Copying Garbage Collection Work

Now that we know what two-space copying collection is, let's implement it!
We briefly covered the steps of Cheney's algorithm earlier, but let's explicitly enumerate them here:

1. Iterate through the roots of the current state of the program in order. For each:
    1. Copy the root from the From Space into the first available space in the To Space.
    2. Replace the memory location in the From Space originally inhabited by the root with a forwarding pointer pointing to its new location in the To Space.
2. Iterate through the objects in the To Space in order. For each:
    1. If the object references anything, find the referenced memory in the From Space (note, at this point, all references will be to the From Space). Then:
        1. If that memory is a forwarding pointer, update the reference in the To Space with the location pointed to by the forwarding pointer and move on.
        2. Otherwise, copy the object referenced into the next available space in the To Space.
        3. Replace the memory location in the From Space originally inhabited by the object with a forwarding pointer pointing to its new location in the To Space.
        4. Update the reference in the To Space that pointed to this location in the From Space with the object's new location in the To Space.
3. Empty all memory in the From Space.
4. Flip the To Space and the From Space and return to program execution, allocating new memory in the old To Space/new From Space.

That's it!
Those are all the steps to Cheney's algorithm.
However, that was a bit abstract, so let's try to clarify with a concrete example.

### Mock Example

Let's see how this works using a simple, concrete example.
Suppose we have a programming language with only two data types:

1. Integers (represented by `i`) that only store a single number
2. Pairs (represented by `c` for `cons`) that store two pointers

To denote what type each object in memory is, we'll put the data type before the values stored in the object.
We'll use  to represent empty memory.
Let's also say that as a program has been executing, the current state of memory allocated is:

| Address | Value | Address | Value |
|:---:|:---:|:---:|:---:|
| `0` | `i` | `16` |  |
| `1` | `1` | `17` |  |
| `2` | `i` | `18` |  |
| `3` | `2` | `19` |  |
| `4` | `i` | `20` |  |
| `5` | `3` | `21` |  |
| `6` | `i` | `22` |  |
| `7` | `4` | `23` |  |
| `8` | `c` | `24` |  |
| `9` | `0` | `25` |  |
| `10` | `2` | `26` |  |
| `11` | `i` | `27` |  |
| `12` | `5` | `28` |  |
| `13` | `c` | `29` |  |
| `14` | `8` | `30` |  |
| `15` | `11` | `31` |  |

Finally, let's say that the roots point to `0` and `8`.

So, what happens when we collect garbage?
Well, first, let's copy over our two roots and leave forwarding pointers (`f`):

| Address | Value | Address | Value |
|:---:|:---:|:---:|:---:|
| `0` | `f` | `16` | `i` |
| `1` | `16` | `17` | `1` |
| `2` | `i` | `18` | `c` |
| `3` | `2` | `19` | `0` |
| `4` | `i` | `20` | `4` |
| `5` | `3` | `21` |  |
| `6` | `i` | `22` |  |
| `7` | `4` | `23` |  |
| `8` | `f` | `24` |  |
| `9` | `18` | `25` |  |
| `10` | `2` | `26` |  |
| `11` | `i` | `27` |  |
| `12` | `5` | `28` |  |
| `13` | `c` | `29` |  |
| `14` | `8` | `30` |  |
| `15` | `11` | `31` |  |

To copy those over, we would have needed to know where in the To Space was available for copying memory.
Let's create a variable that points to that location.
We'll call it our `free` pointer, since it points to the first free space in the To Space.
Originally, it pointed to `16`.
After we copying the root at `0`, it became `18`.
Now, it's `21`.

Ok, so what next?
Well, we need to iterate through all the values in the To Space.
We need another variable to keep track of this;
we'll call it our `scan` pointer since it scans the current values in the To Space.
Right now, it should point to `16`.

`free= 21`, `scan = 16`

| Address | Value | Address | Value |
|:---:|:---:|:---:|:---:|
| `0` | `f` | `16`<-`scan` | `i` |
| `1` | `16` | `17` | `1` |
| `2` | `i` | `18` | `c` |
| `3` | `2` | `19` | `0` |
| `4` | `i` | `20` | `4` |
| `5` | `3` | `21`<-`free` |  |
| `6` | `i` | `22` |  |
| `7` | `4` | `23` |  |
| `8` | `f` | `24` |  |
| `9` | `18` | `25` |  |
| `10` | `2` | `26` |  |
| `11` | `i` | `27` |  |
| `12` | `5` | `28` |  |
| `13` | `c` | `29` |  |
| `14` | `8` | `30` |  |
| `15` | `11` | `31` |  |

At address `16`, we just have an integer.
It doesn't reference anything so we can move on to the next object in the To Space.
So, let's update `scan` to now point to whatever comes right after the integer, `18`.

`free= 21`, `scan = 18`

| Address | Value | Address | Value |
|:---:|:---:|:---:|:---:|
| `0` | `f` | `16` | `i` |
| `1` | `16` | `17` | `1` |
| `2` | `i` | `18`<-`scan` | `c` |
| `3` | `2` | `19` | `0` |
| `4` | `i` | `20` | `4` |
| `5` | `3` | `21`<-`free` |  |
| `6` | `i` | `22` |  |
| `7` | `4` | `23` |  |
| `8` | `f` | `24` |  |
| `9` | `18` | `25` |  |
| `10` | `2` | `26` |  |
| `11` | `i` | `27` |  |
| `12` | `5` | `28` |  |
| `13` | `c` | `29` |  |
| `14` | `8` | `30` |  |
| `15` | `11` | `31` |  |

The object at `scan=18` does reference other memory!
We need to copy those over to the To Space too.
The first location referenced by this object is `0`, so let's go there first.
At `0`, we have a forwarding pointer to `16`.
This makes our life easy, we just need to update the address.
Now, instead of pointing to `0`, we point to `16`:

`free= 21`, `scan = 18`

| Address | Value | Address | Value |
|:---:|:---:|:---:|:---:|
| `0` | `f` | `16` | `i` |
| `1` | `16` | `17` | `1` |
| `2` | `i` | `18`<-`scan` | `c` |
| `3` | `2` | `19` | `16` |
| `4` | `i` | `20` | `4` |
| `5` | `3` | `21`<-`free` |  |
| `6` | `i` | `22` |  |
| `7` | `4` | `23` |  |
| `8` | `f` | `24` |  |
| `9` | `18` | `25` |  |
| `10` | `2` | `26` |  |
| `11` | `i` | `27` |  |
| `12` | `5` | `28` |  |
| `13` | `c` | `29` |  |
| `14` | `8` | `30` |  |
| `15` | `11` | `31` |  |

The `cons` at `18` also references `4` so we need to copy that also.
So, we move the object at `4` to the next available space in the To Space, the address of which is stored in `free`.
Then, we leave a forwarding pointer and we update the address referenced in the To Space.
Finally, we increment both `free` and `scan`.

`free= 23`, `scan = 21`

| Address | Value | Address | Value |
|:---:|:---:|:---:|:---:|
| `0` | `f` | `16` | `i` |
| `1` | `16` | `17` | `1` |
| `2` | `i` | `18` | `c` |
| `3` | `2` | `19` | `16` |
| `4` | `f` | `20` | `21` |
| `5` | `21` | `21`<-`scan` | `i` |
| `6` | `i` | `22` | `3` |
| `7` | `4` | `23`<-`free` |  |
| `8` | `f` | `24` |  |
| `9` | `18` | `25` |  |
| `10` | `2` | `26` |  |
| `11` | `i` | `27` |  |
| `12` | `5` | `28` |  |
| `13` | `c` | `29` |  |
| `14` | `8` | `30` |  |
| `15` | `11` | `31` |  |

Now, `scan` still points to an object in the To Space.
So, we repeat the process.
Since the object at `21` doesn't reference anything, we have nothing new from the From Space to copy.
We just update `scan` and that's it.

`free= 23`, `scan = 23`

| Address | Value | Address | Value |
|:---:|:---:|:---:|:---:|
| `0` | `f` | `16` | `i` |
| `1` | `16` | `17` | `1` |
| `2` | `i` | `18` | `c` |
| `3` | `2` | `19` | `16` |
| `4` | `f` | `20` | `21` |
| `5` | `21` | `21` | `i` |
| `6` | `i` | `22` | `3` |
| `7` | `4` | `23`<-`free`,`scan` |  |
| `8` | `f` | `24` |  |
| `9` | `18` | `25` |  |
| `10` | `2` | `26` |  |
| `11` | `i` | `27` |  |
| `12` | `5` | `28` |  |
| `13` | `c` | `29` |  |
| `14` | `8` | `30` |  |
| `15` | `11` | `31` |  |

Now we're done copying!
Since `scan == free`, we know there are no more objects left in the To Space that reference anything in the From Space.
We've collected all the live data and just need to empty out the old From Space.

| Address | Value | Address | Value |
|:---:|:---:|:---:|:---:|
| `0` |  | `16` | `i` |
| `1` |  | `17` | `1` |
| `2` |  | `18` | `c` |
| `3` |  | `19` | `16` |
| `4` |  | `20` | `21` |
| `5` |  | `21` | `i` |
| `6` |  | `22` | `3` |
| `7` |  | `23` |  |
| `8` |  | `24` |  |
| `9` |  | `25` |  |
| `10` |  | `26` |  |
| `11` |  | `27` |  |
| `12` |  | `28` |  |
| `13` |  | `29` |  |
| `14` |  | `30` |  |
| `15` |  | `31` |  |

Two-space copying garbage collection is as simple as that!
We'll get to actually writing code [next time](../240527-semispace-gc-code/).
