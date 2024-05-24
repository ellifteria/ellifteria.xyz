---
title: Garbage Collection (But With Math)
summary: Mathematically Modeling Garbage Collection
template: page
path:
    -   name: Posts
        link: /posts
    -   name: Garbage Collection (But With Math)
        link: /posts/24/05/240523-gc-math
        self: true
series:
    name: Garbage Collection
    link: /posts/series/gc
---

In my [last post](../240522-gc/), I talked about garbage collection very broadly and, in my [next post](../240523-semispace-gc/), I'm going to describe how to implement one garbage collection strategy.
In this post, let's briefly go in a different direction and talk about modeling garbage collection.

***NOTE:*** This is the most mathematically and technically complicated post in this series and is not the nicest introduction to modeling programming languages.
However, I felt that any discussion of garbage collection should include garbage collection from the modeler's perspective.

## What Does Modeling Programming Languages Mean?

Before we can talk about modeling garbage collection, let's talk about modeling programming languages in general.
Modeling programming languages, essentially, means looking at programming languages not with a lens on their implementation, but with a focus on mathematically proving properties of them.
This sounds complicated, but we're going to make it simple—or, at least, as simple as I can<label for="sidenote--sn1" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn1" class="margin-toggle"/><span class="sidenote">
Understanding what a set is is the most important thing.
</span>.
If you're not interested in mathematically proving properties of programming languages or don't think you have the necessary background to understand this post<label for="sidenote--sn2" class="margin-toggle sidenote-number"> </label><input type="checkbox" id="sidenote--sn2" class="margin-toggle"/><span class="sidenote">
Maybe I'll do a short series on mathematically modeling programming languages in the future.
</span>, feel free to [skip it](../240523-semispace-gc/).
The next post doesn't rely on this one at all.

So, why might one mathematically model programming languages?
A couple of reasons.
For one, suppose you were designing a new programming language.
By mathematically modeling the semantics<label for="sidenote--sn3" class="margin-toggle sidenote-number"> </label><input type="checkbox" id="sidenote--sn3" class="margin-toggle"/><span class="sidenote">
Semantics refers to the study of the meaning of a programming language. The semantics of a programming language describes the steps a computer performs when it executes a program in that language.
</span> of the language, you would be providing an outline that any implementation would have to follow.
This means that run systems could be developed to execute programs written in your language that would all behave the same if they were to follow the model.
There's no ambiguity as to how a program should be executed since the mathematical model would explicitly define the semantics of the language.
Another reason is proving properties of the programming language.
Building models of programming languages can allow you to prove properties such as correctness about the language by specifying exactly how programs should execute.
Models define exactly what states the program can reach and from what other states.

## What Does Modeling Garbage Collection Mean?

So, what does modeling garbage collection help us do?
For one, we can define and prove certain properties of garbage collection.
This is **very** important.
Since garbage collection directly manipulates the state of a program, it must leave the program in a state such that the program can continue executing as though no garbage collection.
In other words, a programming language with garbage collection must evaluate in a way that is semantically equivalent to the same programming language without garbage collection.

Since modeling also lets us describe the semantics of a programming language, we can also describe the steps that a computer should go through when collecting garbage in a given programming language.

## Mathematically Modeling Garbage Collection

Ok, onto the math.
Given a state:

$$
\left\langle c, \kappa, \Sigma^+\right\rangle
$$

Made up of a current expression and it's environment, $c = \left\langle e, \rho \right\rangle$; a continuation, $\kappa$, to return to after evaluating the current expression; and the memory allocated by a program, $\Sigma^+$, garbage collection is defines as:

$$
\left\langle c, \kappa, \Sigma \oplus \Sigma' \right\rangle \mapsto \left\langle c, \kappa, \Sigma \right\rangle
$$

Such that:

$$
dom\left(\Sigma'\right) \cap \left(\left(\bigcup_{v \in roots\left(\Sigma\right)} L\left(v\right)\right) \cup L\left(c\right) \cup L\left(\kappa\right)\right) = \emptyset
$$

Where $L\left(x\right)$ refers to the live memory reachable from $x$, $dom\left(x\right)$ refers to the domain of $x$, and $roots\left(x\right)$ refers to the roots of the memory $x$.

Now, that looks intimidating.
However, I promise it's not as bad as it seems.
So, what does this mean?

The key idea is that garbage collection is a function that partitions the memory allocated by the program before garbage collection, $\Sigma^+$, into two mutually exclusive portions.
One of which, $\Sigma$, becomes the allocated memory accessible to the program after garbage collection and the other, $\Sigma'$, is discarded.
Furthermore, $\Sigma'$ is defined such that no memory reachable from (1) the current expression being evaluated and its environment, (2) the continuation to which the program returns, and (3) any of the roots of the program's memory is in the discarded portion, $\Sigma'$.

In other words, garbage collection is defined as a function that discards only memory that is not reachable from the program's current state.
