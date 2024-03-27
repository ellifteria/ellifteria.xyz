---
Title: Writing Programming Languages in Racket
Summary: A First Meta-Program
Tags:
- pl
- plai
date: 24-01-04
template: page
Params:
    BackLink: programming-languages
    BackLinkText: Programming Languages
---

We'll use `plai` and `racket` to write meta-languages.

Here, we'll create a basic interpreter using this grammar.

```text
<expr>  ::= {+ <expr> <expr>}
        |   {- <expr> - <expr>}
        |   <num>
<num>   ::= a number
```

Our goal is to write an interpreter that correctly evaluates expressions; for example, `(interp {+ {- 1 2} {+ 3 4}}) => 6`

```racket
#lang plai
```

`(define-type type-id variant...)` is how we define types in `plai`.
Each `variant` takes the form `[variant-id (field-id contract-expr?)...]`.

```racket
(define-type AE
    [num    (n number?)]
    [add    (l AE?)
            (r AE?)]
    [sub    (l AE?)
            (r AE?)])
```

We use `define` to define functions or variables.

```racket
(define (interp an-ae)
    (type-case AE an-ae)
        [num    (n) n]
        [add    (l r)   (+  (interp l)
                            (interp r))]
        [sub    (l r)   (-  (interp l)
                            (interp r))])
```

We use `type-case` to determine which case of a type the variable is.
The syntax is `(type-case type variable)` where `type` is the name of the type and `variable` is the variable of that type.
`type-case` automatically raises an error when it is not filled with all cases of type `type`.
