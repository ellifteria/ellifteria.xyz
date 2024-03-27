---
title: esterel, racket, and rhombus
summary: an introduction
template: pageList
path:
    -   name: tiwo
        link: /tiwo
    -   name: esterel
        link: /tiwo/2024/nu/esterel/
    -   name: "26 mar 2024: an introduction"
        link: /tiwo/2024/nu/esterel/03/26/
        self: true
---

## What is Esterel?

Esterel is a synchronous reactive programming language.
I wrote a bit about Esterel [[/notes/2024/nu/esterel/index|here]].

## What am I doing?

I am working with Lukas Lazarek<label for="sidenote--ll"
       class="margin-toggle sidenote-number">
</label>
<input type="checkbox"
       id="sidenote--ll"
       class="margin-toggle"/>
<span class="sidenote">
   [Lukas's GitHub](https://github.com/LLazarek)
</span>
on implementing Esterel in the Rhombus language<label for="sidenote--rhombus"
       class="margin-toggle sidenote-number">
</label>
<input type="checkbox"
       id="sidenote--rhombus"
       class="margin-toggle"/>
<span class="sidenote">
    [Rhombus on the Racket docs](https://docs.racket-lang.org/rhombus/index.html)
</span>
.

## Why am I doing this?

So that you can write Esterel programs like this:

```scheme
def_signal: A

def strlPrgm:
    esterel:
        emit(A)

react(strlPrgm)
```

instead of like this!

```scheme
(define-signal A)

(define strlPrgm
    (esterel
        (emit A)))

(react! strlPrgm)
```

## What has been completed so far?

We started today, so not much.

But, we have gotten some basic bindings<label for="sidenote--basicBindings"
       class="margin-toggle sidenote-number">
</label>
<input type="checkbox"
       id="sidenote--basicBindings"
       class="margin-toggle"/>
<span class="sidenote">
   right now, we're building off of original bindings written by [Matthew Flatt](https://github.com/mflatt) for a subset of [Robby Findler's](https://github.com/rfindler) [Esterel in Racket](https://docs.racket-lang.org/esterel/index.html)
</span>
working!

## What needed to be fixed?

To understand what needed to be fixed, it's important to realize that Rhombus is built on Racket and is backwards compatible with Racket.
Mostly.
Functions, maps, primitives, and many other Rhombus data types are equivalent to their Racket counterparts.
And it turns out, in an earlier version of the Rhombus Prototype, lists in Rhombus were also equivalent to their Racket counterparts.
That means, you could use Rhombus `List`s in Racket functions in this earlier version.

Now, however, Rhombus `List`s are NOT equivalent to Racket lists.
For example, this would NOT raise an error in an earlier version on Rhombus but now does:

```scheme
#lang rhombus

import:
    lib("racket/base.rkt") as base

base.#{list-tail}([1, 2, 3, 4, 5], 2)
```

There is a fix though!
While Rhombus `List`s are different than Racket lists, Rhombus `PairList`s ARE equivalent to Racket lists.
That means that this code does work in Rhombus:

```scheme
#lang rhombus

import:
    lib("racket/base.rkt") as base

base.#{list-tail}(PairList(1, 2, 3, 4, 5), 2)
```

Basically, the issue with three of the Rhombus macros was that they were passing Rhombus `List`s to Racket functions, which did not work.
Converting the Rhombus `List`s to `PairList`s fixed these bugs!

## What else has been done?

`sustain` can now be used in Rhombus!
Like with `emit`, the `sustain` function is exposed through a wrapper function from the Racket implementation.

```scheme
#lang rhombus

def_signal: A

def sustainTest:
    esterel:
        sustain(A)
```

```scheme
> react(sustainTest)
{#{'#<signal: A>}: #true}
> react(sustainTest)
{#{'#<signal: A>}: #true}
> react(sustainTest)
{#{'#<signal: A>}: #true}
```

There's also a new shorthand for defining Esterel programs!
Instead of:

```scheme
def strlPrgm:
    esterel:
        emit(A)
```

You can now just write!

```scheme
def_strl strlPrgm:
    emit(A)
```
