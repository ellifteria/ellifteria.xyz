---
Title: Grammar for Algebraic Programs
Summary: Grammar
Tags:
- pl
- grammar
- bnf
date: 24-01-04
template: page
Params:
    BackLink: programming-languages
    BackLinkText: Programming Languages
---

## Algebraic Grammar in BNF

Example of a grammar of algebra in Backus-Naur Form (BNF)

```text
<prog>  ::= <defn>* <expr>
<defn>  ::= <id><id> = <expr>
<expr>  ::= <expr> + <expr>
        |   <expr> - <expr>
        |   <id>(<expr>)
        |   <id>
        |   <num>
<id>    ::= a variable name: f, x, y, z, ...
<num>   ::= a number
```

`::=` defines the left hand side to be the right hand side.

A **meta-variable** such as `<prog>` defines a set.
For example, `<id>` is the set of all variable names and `<num>` is the set of all numbers.

We can get elements of sets using `∈`.
For example, `2 ∈ <num>`.

```text
<expr>  ::= <expr> + <expr>
        |   <expr> - <expr>
        |   <id>(<expr>)
        |   <id>
        |   <num>
```

The set `<expr>` is defined in terms of other sets.
`|` is the "or" operator.
Elements of the set `<expr>` are:

- numbers
- variable names
- a function call on an element of `<expr>`
- an element of `<expr>` subtracted from an element of `<expr>`
- an element of `<expr>` added to an element of `<expr>`

`*` is the Kleene star and means "zero or more of".
So `<prog>  ::= <defn>* <expr>` means zero or more `<defn>`s followed by one `<expr>`.

## What is a Programming Language?

A **programming language** is defined by:

- a **syntax** which is a grammar that describes what programs are
- **semantics** which are the rules for how to evaluate a program

## Note on Notation

Curly braces `{}` are for meta-language elements.
Parentheses `{}` are for object-language elements.
