---
title: Intro to Esterel
summary: Introduction to Esterel and Esterel in Racket
template: page
path:
    -   name: Notes
        link: /notes
    -   name: Esterel
        link: /notes/2024/nu/esterel
    -   name: Intro
        link: /notes/2024/nu/esterel/03/26/intro
        self: true
---

## What is Esterel?

Esterel<label for="sidenote--esterelLink"
       class="margin-toggle sidenote-number">
</label>
<input type="checkbox"
       id="sidenote--esterelLink"
       class="margin-toggle"/>
<span class="sidenote">
    [Esterel on Wikipedia](https://en.wikipedia.org/wiki/Esterel)
</span>
is a synchronous reactive programming language developed in France in the 80s.
In Esterel, operations are executed in parallel threads with specific synchronous timing.

There are a few implementations of Esterel or Esterel-like languages<label for="sidenote--hipHopJs"
       class="margin-toggle sidenote-number">
</label>
<input type="checkbox"
       id="sidenote--hipHopJs"
       class="margin-toggle"/>
<span class="sidenote">
    such as [HipHop.js](https://github.com/manuel-serrano/hiphop)
</span>.
Here, I'm using<label for="sidenote--devRktStrl"
       class="margin-toggle sidenote-number">
</label>
<input type="checkbox"
       id="sidenote--devRktStrl"
       class="margin-toggle"/>
<span class="sidenote">
    ...[[/tiwo/2024/nu/esterel/index|and working on adding to]]...
</span>
the Racket implementation of Esterel<label for="sidenote--racketEsterel"
       class="margin-toggle sidenote-number">
</label>
<input type="checkbox"
       id="sidenote--racketEsterel"
       class="margin-toggle"/>
<span class="sidenote">
[Esterel in Racket](https://docs.racket-lang.org/esterel/index.html)
</span>.

Writing Esterel in Racket is be done using:

```scheme
#lang racket

(require esterel/full)

(esterel
    ...)
```

In Esterel, `signal`s are "variables"; they are `emit`ed by Esterel programs<label for="sidenote--definingSignals"
       class="margin-toggle sidenote-number">
</label>
<input type="checkbox"
       id="sidenote--definingSignals"
       class="margin-toggle"/>
<span class="sidenote">
    `define-signal` defines `signal`s globally while `with-signal` allows you to locally define `signal`s.
</span>
.

```scheme
#lang racket

(require esterel/full)

(define-signal red)

(define forever-red
    (esterel
        (sustain red)))
```

Running this code doesn't visibly do anything.
You need to `react!` to "ask" Esterel if there are any signals `emit`ted.

```scheme
> (react! forever-red)
'#hash((#<signal: red> . #t))
```

To control the timing of when Esterel signals are `emit`ted, `pause` is used.

```scheme
#lang racket

(require esterel/full)

(define-signal red)

(define forever-red
    (esterel
        (pause)
        (sustain red)))
```

```scheme
> (react! forever-red)
'#hash()
> (react! forever-red)
'#hash((#<signal: red> . #t))
```

Since `forever-red` is `pause`d on the first step, there is no signal `emit`ted.
`react!`ing again walks to the next step and causes `red` to be `sustain`ed.

To run multiple threads in parallel, use `par`:

```scheme
#lang racket

(require esterel/full)

(define-signal red)

(define forever-red
    (esterel
        (par
            (sustain red)
            (sustain green))))
```

```scheme
> (react! forever-red)
'#hash((#<signal: green> . #t) (#<signal: red> . #t))
```
