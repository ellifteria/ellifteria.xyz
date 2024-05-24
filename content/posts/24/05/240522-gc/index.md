---
title: Garbage Collection, Broadly
summary: Basic Introduction to Garbage Collection
template: page
path:
    -   name: Posts
        link: /posts
    -   name: Garbage Collection
        link: /posts/24/05/240522-gc
        self: true
series:
    name: Garbage Collection
    link: /posts/series/gc
---

When choosing a programming language to use for a project—or when implementing one—there are many considerations to keep in mind.
One of those is whether or not the programming language uses any sort of garbage collection<label for="sidenote--sn1" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn1" class="margin-toggle"/><span class="sidenote">
Technically, whether or not a language uses garbage collection is more a question for the run system, not the language itself. The same language could theoretically compile to one target that does not use garbage collection and also be interpreted by an interpreter that does perform garbage collection. In practice, this is not common.
</span>.
For many programmers, whether or not a language uses garbage collection is not at the top of their mind when choosing a language to use.
However, for some projects, this is a critical consideration.
So, what is garbage collection?
Where is it used?
Why is it used?
And can we implement it ourselves?

## What is Garbage Collection?

Very broadly, garbage collection is the process by which a run system of a programming language automatically frees memory no longer being used by the program.
Therefore, garbage collection is a form of automatic memory management.
This is in contrast to manual memory management<label for="sidenote--sn2" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn2" class="margin-toggle"/><span class="sidenote">
How do you know if your programming language requires manual memory management or if memory is managed automatically? If you're asking this question, memory is being managed automatically. Or you're writing some very bad C code.
</span>

### What Languages Use Garbage Collection?

Garbage collection is much more common in scripting languages.

- Python
- JavaScript
- Go
- C#

### What Languages Do NOT Use Garbage Collection?

Scripting languages tend to use not use garbage collection and instead rely on manually manipulating and cleaning up memory.

- C
- C++
- Rust

## Why Do Some Languages Use Garbage Collection

1. Simplifies scripting for the end programmer
2. Does not require programmers to manually de-allocate memory

## Why Do Some Languages NOT Use Garbage Collection

1. Performance hit
2. Can stall program execution
3. Can have substantial overhead

## How Does Garbage Collection Work (Very Broadly)

Run system checks when objects are no longer able to be used by a program and automatically frees up the memory used.

## Strategies for Garbage Collection

- Tracing
- Reference counting
- Stop and copy
