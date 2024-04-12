---
title: "01 Apr 2024: Slow Progress"
summary: Fixing Rhombus Bugs
template: pageList
path:
    -   name: TIWO
        link: /tiwo
    -   name: Esterel
        link: /tiwo/2024/nu/esterel/
    -   name: "01 Apr 2024: Slow Progress"
        link: /tiwo/2024/nu/esterel/04/01/
        self: true
---
## Any updates?

Quite a few actually!
I added a couple features, made some changes to the syntax, and found a new bug.

## What did I add?

Starting off with a simple addition, `signal_index` is now in the Rhombus bindings!
Like with `signal_name`, this is a wrapper for the Racket implementation.

Moving on to the big one, in the Racket bindings, signals can have `value`s that they `emit` and/or `sustain`.
In order for a signal to have a `value`, it has to have a `combine` parameter.
Before, this could not be set in the Rhombus bindings.
It can now!

To set a `combine` parameter in Rhombus, use `{[$id, $combine], ...}` syntax:

```scheme
def_signal {[A, fun (x, y) : x + y], [B, fun (x, y) : x + y], [C, fun (x, y) : x + y]}

def_strl strlPrgm:
    sustain(A, 1) ||| sustain(B, 2) ||| sustain(C, 3)

> react(strlPrgm)
{#{'#<signal: C>}: 3, #{'#<signal: B>}: 2, #{'#<signal: A>}: 1}
```

To define signals without `combine`, just use `def_signal {A, B, C}`.
You may notice that `def_signal` looks a bit different, so...

## New syntax?

A couple of changes here:

1. `with_signals` -> `with_signal` (to be consistent with `def_signal`)
2. `def_signal: A B C` -> `def_signal {A, B, C}` (to be consistent with `with_signal {A, B, C}:`)

## There's a bug?

Yes.
Say we have the following definition:

```scheme
def_strl strlPrgm:
    with_signal {A}:
        sustain(A)
```

This should work, right?<label for="sidenote--itDoes"
       class="margin-toggle sidenote-number">
</label>
<input type="checkbox"
       id="sidenote--itDoes"
       class="margin-toggle"/>
<span class="sidenote">
   (yes, it should)
</span>
Well, unfortunately, it doesn't.
What happens?
When we run it the first time, we get:

```scheme
> react(strlPrgm)
{#{'#<signal: A (0)>}: #true}
```

That looked right.
So where's the bug?
Let's run it again:

```scheme
> react(strlPrgm)
match: no matching clause for Array(#{'#<signal: A (0)>}) [,bt for context]
```

There's the error.
The issue is that in the Racket bindings, there is a `match` statement that cannot match an array of a single signal.
However, this `match` statement should not be trying to match a single signal.
Instead, it should be trying to match a vector of signals.

And it does, for more than one signal.
So this works:

```scheme
def_strl strlPrgm:
    with_signal {A, B}:
        sustain(A) || sustain(B)
> react(strlPrgm)
{#{'#<signal: B (1)>}: #true, #{'#<signal: A (0)>}: #true}
> react(strlPrgm)
{#{'#<signal: B (1)>}: #true, #{'#<signal: A (0)>}: #true}
> react(strlPrgm)
{#{'#<signal: B (1)>}: #true, #{'#<signal: A (0)>}: #true}
```

So, there's a bug somewhere if there's a single signal being `emit`ted or `sustain`ed.
I think I know where it is, I just need to do some debugging to fix it!
