---
Title: Variables and Binding
Summary: Variable Scope
Tags:
- pl
- plai
- variables
- binding
- scope
date: 24-01-09
template: page
Params:
    BackLink: programming-languages
    BackLinkText: Programming Languages
---

The following PLAI programs are equivalent:

```racket
(define (f x) (+ x 1))
(f 10)
```

and

```racket
(define (f y) (+ y 1))
(f 10)
```

## Free and Bound Identifiers

There are 3 types of identifiers, or variable usages:

1. **Binding** where a local variable or function argument is defined to a variable identifier
2. **Bound** where a function argument or an already-defined local variable variable—a bound identifier—is used
3. **Free** an identifier that would be a bound identifier; however, the identifier has not been bounds—i.e., there is no corresponding binding identifier

```racket
(define (f x)
    (+ x a))
```

In the above example, the first `x` is a binding identifier, the second `x` is a bound identifier, `a` is a free identifier.

**Shadowing** occurs when a bound identifier is re-bound—when binding occurs on an already bound identifier:

```racket
(local [define x 3]
    (local [define x 4]
        (+ x x)))
```

## Language Example

Consider the following language:

```text
<WAE>   ::= <num>
        |   {+ <WAE> <WAE>}
        |   {- <WAE> <WAE>}
        |   {with {<id> <WAE>} <WAE>}
        |   <id>
```

The following are valid programs in this language and their result:

```text
{with {x {+ 1 2}}
    {+ x x}}
=> 6
```

```text
{+  {with {x {+ 1 2}}
        {+ x x}}
    {with {y {- 4 3}}
        {+ y y}}}
=> 8
```

### PLAI Implementation

To define `<WAE>`:

```racket
(define-type WAE
    [num    (n number?)]
    [add    (lhs WAE?)
            (rhs WAE?)]
    [sub    (lhs WAE?)
            (rhs WAE?)]
    [with   (name symbol?)
            (named-expression WAE?)
            (body WAE?)]
    [id     (name symbol?)])
```

***NOTE**: `8` is NOT a `WAE`. To make `8` a `WAE` we need to do `(num 8)`. When defining an `id`—for example if we wanted to do `(with 'x ...) ...`—we should NOT use `id('x)` directly following the `with`; this is because we need `'x` to be a symbol. Thus, the proper syntax IS `(with 'x (num 8))...`.*

For the interpreter:

```racket
(define (interpret a-wae)
    (type-case WAE a-wae
        [num    (n)
            n]
        [add    (lhs rhs)
            (+
                (interpret lhs)
                (interpret rhs))]
        [sub (lhs rhs)
            (-
                (interpret lhs)
                (interpret rhs))]
        [with (name named-expression body)
            (interpret
                named-expression)
            (interpret
                (substitute
                    body
                    name
                    (interpret
                        named-expression)))]
        [id (name)
            (error
                'interpret
                "free identifier: ~s" name)]))
```

`(test/exn expression error-message)` tests if something throws an error.
The error message must include `error-message` as a substring.

`(error function-name error-message)` throws an error.

We also need to define a function `(substitute expression identifier identifier-value)` that substitutes `identifier-value` into all occurrences of `identifier` in `expression`.

```racket
(define substitute x value
    (type-case WAE a-wae
        [num    (n)
            a-wae]
        [add    (lhs rhs)
            (add
                (substitute lhs x value)
                (substitute rhs x value))]
        [sub    (lhs rhs)
            (sub
                (substitute lhs x value)
                (substitute rhs x value))]
        [with   (name named-expression body)
            (with name
                (substitute named-expression name value)
                (if (equal? name x)
                    body
                    (substitute body name value)))]
        [id     (id-name)
            (if (equal? x id-name)
                (num value)
                (id id-name))]))
```
