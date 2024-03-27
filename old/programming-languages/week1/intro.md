---
Title: Introduction to Programming Languages
Summary: Programming Languages Key Ideas
Tags:
- pl
date: 24-01-04
template: page
Params:
    BackLink: programming-languages
    BackLinkText: Programming Languages
---

## Key Ideas

### Programs are Data

Other programs can operate on programs.
For example, they could count the number of lines in a program, run a program, check properties of a program.

Other programs can also generate programs.
For example, compilers can make programs more efficient or automated code generators can automatically write aspects of programs.

### Meta-Languages vs Object-languages

**Meta-language** programs, **meta-programs**, operate on **object-language** programs, **object-programs**.
So, if we have a Python interpreter written in C, C is the meta-language and python is the object-language.

### Types of Meta-Programs

The two most common types of meta-programs are interpreters and compilers.
Compilers take an object-program written in the object-language and generate other code.
Interpreters take an object-program written in the object-language and evaluate the program.
