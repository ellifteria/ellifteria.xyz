---
Title: State
Summary: Where Math and CS Diverge
Tags:
- pl
- plai
- state
date: 24-01-30
template: page
Params:
    BackLink: programming-languages
    BackLinkText: Programming Languages
---

State is inherently un-mathematical; state is effectively where math and computer science diverge.
For a long time, PLists tried to represent programming language semantics purely mathematically—but state got in the way.

To have state, a computer needs some memory that the programming language can index (pointers), retrieve values from, and modify.

Here, we'll use a `store`, a type of linked list, to represent memory:

```racket
(define-type Store
    [emptyStore]
    [store
        (address integer?)
        (value FAE-Value?)
        (next Store?)])
```

***NOTE: for our programming language, we are NOT considering the C/C++/Rust style of programming languages where ALL values are stored in memory, and the programming language must manipulate and keep track of values in memory.***
