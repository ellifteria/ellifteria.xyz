---
title: "08 Apr 2024: Upgrading Signals"
summary: Adding Features and Fixing Bugs
template: pageList
path:
    -   name: TIWO
        link: /tiwo
    -   name: Esterel
        link: /tiwo/2024/nu/esterel/
    -   name: "08 Apr 2024: Upgrading Signals"
        link: /tiwo/2024/nu/esterel/04/01/
        self: true
---

Remember the big change made last time?
Well... I overwrote that.
But!
For good reason.

Esterel `signal`s in Rhombus are much more powerful now.
In fact, any `signal` possible to create in Racket can now be made in Rhombus too.

## New signal syntax?

So, now to define `signal`s, you use the pattern:

```scheme
def_signal {$signal_definition,...}
```

This is the same as last time.
However, each signal definition is now a `SignalDefinition` which has the following forms:

```text
SignalDefinition:
| '[$id_expr, ~memoryless, ~init $init_expr, ~combine $combine_expr]'
| '[$id_expr, ~init $init_expr, ~combine $combine_expr]'
| '[$id_expr, ~combine $combine_expr]'
| '[$id_expr, ~single]'
| '$id_expr'
```

So the example from last time `def_signal {[A, fun (x, y) : x + y], [B, fun (x, y) : x + y], [C, fun (x, y) : x + y]}` would now be:

```scheme
def_signal {[A, ~combine fun (x, y) : x + y], [B, ~combine fun (x, y) : x + y], [C, ~combine fun (x, y) : x + y]}
```

You need the `~combine` keyword preceding the combine function so that now, unlike before you can mix signals that have:

- just an `id`
- an `id` and a `combine`
- an `id`, a `combine`, and an `init`
- a `memoryless` `id`, a `combine`, and an `init`
- or are just `single`

This means that any `signal` that can be defined in the Racket implementation can now be defined in the Rhombus implementation!

## Bug fixes?

Last time, I mentioned there was a bug where `with_signal` would raise an error if it was `emit`ting only one `signal` on a subsequent `react`ion.
That's been fixed now!
This means that the bugs and limitations in `def_signal` and `with_signal` should now be all ironed out in the Rhombus implementation.
