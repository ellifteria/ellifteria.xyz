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

Made up of a current expression and it's environment, $c = \left\langle e, \rho \right\rangle$; a continuation, $\kappa$, to return to after evaluating the current expression; and the memory allocated by a program, $\Sigma^+$, garbage collection is defined as:

$$
\left\langle c, \kappa, \Sigma \oplus \Sigma' \right\rangle \rightarrow \left\langle c, \kappa, \Sigma \right\rangle
$$

Such that:

$$
\Sigma' \cap \left(L\left(c\right) \cup L\left(\kappa\right)\right) = \emptyset
$$

Where $L\left(x\right)$ refers to the live memory reachable from $x$.
We'll also define another function, $L_i\left(x\right)$, which will be the memory immediately reachable from $x$—in other words, the memory directly referenced by $x$ and $x$ itself.
Now we can define $y \in L\left(x\right)$ such that $\exists x_1, \dots, x_n$ where $y \in L_i\left(x_n\right)$, $x_n \in L_i\left(x_{n-1}\right)$, $\dots$, $x_1 \in L_i\left(x\right)$.

Now, that looks intimidating.
However, I promise it's not as bad as it seems.
So, what does this mean?

The key idea is that garbage collection is a function that partitions the memory allocated by the program before garbage collection, $\Sigma^+$, into two mutually exclusive portions.
One of which, $\Sigma$, becomes the allocated memory accessible to the program after garbage collection and the other, $\Sigma'$, is discarded.
Furthermore, $\Sigma'$ is defined such that no memory reachable from (1) the current expression being evaluated and its environment and (2) the continuation to which the program returns.

In other words, garbage collection is defined as a function that discards only memory that is not reachable from the program's current state.

Does this tell us very much?
On its own, not really.
It's a mathematical restatement of something we already knew: garbage collection cannot discard any live memory still being used by the program.

This definition also doesn't tell us what garbage collection *should* do, only what it *must* do.
Garbage collection *must* not discard any live memory.
But what memory *should* it discard?
Does the formula tell us?
Suppose that $\Sigma'=\emptyset$.
By definition, the intersection of the empty set with anything else is the empty set.
So, if $\Sigma'=\emptyset$, the definition of garbage collection is still satisfied.
However, this means that we discarded no memory; the memory accessible to the program after garbage collection is the same as the memory accessible to the program before garbage collection.
A garbage collector that doesn't collect any garbage ever is not a terribly useful garbage collector.

Lastly, the definition doesn't tell us *how* we should be collecting garbage either.
All it states is "garbage collection is a function that only changes the memory accessible to a program and discards only un-alive memory that is not accessible from the current state of the program."
It doesn't explain what steps we should take to collect garbage, how we choose which memory should be kept, etc.

So then, why would we model garbage collection like this?
Just to make mathematicians happy?
Well, there actually is a very good reason if we go a step further and delve into that last problem, if we mathematically model *how* we collect garbage.

Let's say we mathematically model all of the steps we take to collect garbage.
In other words, we provide mathematical functions that map how we partition $\Sigma^+$ into $\Sigma$ and $\Sigma'$.
By doing so, we would be able to write a mathematical proof that shows that by applying those functions until $\Sigma^+$ is fully partitioned, we meet the definition of garbage collection.
Put another way, we can prove that the steps that define how to collect garbage satisfy the requirement that only un-alive memory is discarded.

### Too Many Words, Not Enough Math

Let's give an actual example of this.
Here, we'll use a very simple garbage collection algorithm: Mark and Sweep.
How does mark and sweep work?
It marks all the memory that needs to be kept and sweeps the rest away.

That's very abstract so let's break it down further.
The steps of mark and sweep garbage collection are:

1. Color all memory white
2. Color all memory immediately reachable from the current state (all the roots) grey
3. Pick a grey memory object
4. Color all memory reachable by that grey object
5. Color that grey object black
6. Repeat steps 3. through 5. until there are no grey objects

Now, I promised math, so let's do some math.
We can represent garbage collection as a state machine:

$$
\left\langle G, B, \Sigma^+ \right\rangle
$$

Note that since all allocated memory will either be grey, black, or white, the white memory is the memory that is not grey or black: $W = \Sigma^+ \setminus \left(G \cup B \right)$.

We can represent step 1 as:

$$
\left\langle \emptyset, \emptyset, \Sigma^+ \right\rangle
$$

All memory is marked as white.
For our initial marking (step 2), we set $G = L_i\left(c\right) \cup L_i\left(\kappa\right)$:

$$
\left\langle L_i\left(c \right) \cup L_i\left(\kappa \right), \emptyset, \Sigma^+ \right\rangle
$$

Steps 3. through 5. can be represented with a single function mapping:

$$
\left\langle G, B, \Sigma^+ \right\rangle \rightarrow {\left\langle\left(G \cup L_i\left(\sigma\right)\right)\setminus\left(B \cup \left\{\sigma\right\}\right), B \cup \left\{\sigma\right\}, \Sigma^+\right\rangle}_{\sigma \in G}
$$

A grey object ($\sigma \in G$) is chosen, all memory reachable from the object this is not marked black is colored grey ($G \rightarrow \left(G \cup L_i\left(\sigma\right)\right)\setminus\left(B \cup \left\{\sigma\right\}\right)$), and then the object is colored black ($B \rightarrow B \cup \left\{\sigma\right\}$).

Eventually, all elements will be colored white or black:

$$
\left\langle \emptyset , B, \Sigma^+ \right\rangle
$$

Now, we have to plug this into our definition of garbage collection.
Since $B$, the memory we colored black, contains all the memory that is reachable from the current program state, $B$ is the live memory that should be kept post-garbage collection.
Everything else can be swept away.
Therefore, when we partition $\Sigma^+$ into $\Sigma$ (the memory we keep) and $\Sigma'$ (the memory we discard), we just need to set $\Sigma = B$.

$$
\left\langle c, \kappa, \Sigma^+ \right\rangle \rightarrow \left\langle c, \kappa, \Sigma \right\rangle
$$

Such that:

$$
\left\langle L_i\left(c \right) \cup L_i\left(\kappa \right), \emptyset, \Sigma^+ \right\rangle \twoheadrightarrow_{gc} \left\langle \emptyset , \Sigma, \Sigma^+ \right\rangle
$$

Where $gc$ is defined as:

$$
\left\langle G, B, \Sigma \right\rangle \rightarrow _{gc} {\left\langle\left(G \cup L_i\left(\sigma\right)\right)\setminus\left(B \cup \left\{\sigma\right\}\right), B \cup \left\{\sigma\right\}, \Sigma\right\rangle}_{\sigma \in G}
$$

And just like that, we have a mathematical model of garbage collection!

### Ok, But Why Do We Care?

Why is this important?
We talked about proving properties of garbage collection.
So, let's prove that mark and sweep *actually* satisfies the definition of garbage collection.

Recall that we defined each garbage collection step is defined with:

$$
\left\langle G, B, \Sigma \right\rangle \rightarrow _{gc} {\left\langle\left(G \cup L_i\left(\sigma\right)\right)\setminus\left(B \cup \left\{\sigma\right\}\right), B \cup \left\{\sigma\right\}, \Sigma\right\rangle}_{\sigma \in G}
$$

And that the garbage collection *must* satisfy:

$$
\left(\Sigma^+ \setminus \Sigma\right) \cap \left(L\left(c\right) \cup L\left(\kappa\right)\right) = \emptyset
$$

How do we prove that our garbage collections satisfy this?

Let's write a proof by contradiction.

We'll start by supposing for the purpose of contradiction that there exists an object $\sigma'$ such that:

$$
\sigma' \in \left(\Sigma^+ \setminus \Sigma\right) \cap \left(L\left(c\right) \cup L\left(\kappa\right)\right)
$$

In other words, $\sigma'$ is both in the discarded memory and is reachable by the current program state.
Big no-no.

Recall that we set $\Sigma = B$ once $G = \emptyset$.
Therefore, $\sigma' \notin B$.

However, $\sigma' \in \left(L\left(c\right) \cup L\left(\kappa\right)\right)$.
Therefore, there must exist some $x_1, x_2, \dots x_n$ such that $\sigma' \in L_i\left(x_n\right)$, $x_n \in L_i\left(x_{n-1}\right)$, $\dots$, $x_1 \in \left(L_i\left(c\right) \cup L_i\left(\kappa\right)\right)$.
As such, there exists a step where $x_1 \in G$.
Therefore, there exist steps where $x_2 \in G$, $\dots$, $x_n \in G$.
Therefore, there exists a step when $\sigma' \in G$.
Since $\forall \sigma \in G$, $\sigma$ is moved into $B$ eventually, $\sigma'$ must be moved into $B$ eventually.

This is a contradiction;
$\sigma' \in B$ and $\sigma' \notin B$ cannot both be true.
Therefore, $\not\exists \sigma'$ such that $\sigma' \in \left(\Sigma^+ \setminus \Sigma\right) \cap \left(L\left(c\right) \cup L\left(\kappa\right)\right)$.

Therefore,

$$
\left(\Sigma^+ \setminus \Sigma\right) \cap \left(L\left(c\right) \cup L\left(\kappa\right)\right) = \emptyset
$$

And there we go!
We have proven that our garbage collection function satisfies the definition of garbage collection.
Mark and sweep, if implemented in such a way that aligns with our mathematical model, will not discard any live memory.

## Tl;dr

What's the takeaway from all this?
Mathematically modeling programming languages and garbage collection allows us to prove properties of programming languages and garbage collection.
It also helps describe how a programming language should be implemented.
This lets us implement safer and more secure programming languages!

This simple example may not look like much but it's actually *very* important.
Knowing for certain that garbage collection doesn't discard memory that's still reachable is essential.
Otherwise, we would end up with countless seg faults<label for="sidenote--sn4" class="margin-toggle sidenote-number"> </label><input type="checkbox" id="sidenote--sn4" class="margin-toggle"/><span class="sidenote">
Essentially, we would risk accessing memory after freeing it over and over again since the garbage collector would be freeing memory that the programmer is still potentially using.
</span>.

Writing more complex mathematical models allows us to prove more complex and valuable properties of programming languages, allowing programmers to confidently write programs without the fear of needing to debug their programming language.

This was definitely a much more mathematical post than usual, but I hope it was useful!
[Next time](../240523-semispace-gc/), we'll go return from the world of mathematics and dive deep into semi-space copying garbage collection.
