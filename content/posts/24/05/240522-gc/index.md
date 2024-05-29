---
title: Garbage Collection, Broadly
summary: An Introduction to Garbage Collection
template: page
path:
    -   name: Posts
        link: /posts
    -   name: Garbage Collection
        link: /posts/24/05/240522-gc
        self: true
series:
    name: Garbage Collection
    link: /posts/series/gc
---

When choosing a programming language to use for a project—or when implementing one—there are many considerations to keep in mind.
One of those is whether or not the programming language uses any sort of garbage collection<label for="sidenote--sn1" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn1" class="margin-toggle"/><span class="sidenote">
Technically, whether or not a language uses garbage collection is more a question for the run system, not the language itself. The same language could theoretically compile to one target that does not use garbage collection and to another target that does perform garbage collection. In practice, this is not common.
</span>.
For many programmers, whether or not a language uses garbage collection is not at the top of their mind when choosing a language to use.
However, for some projects, this is a critical consideration.
So, what is garbage collection?
Where is it used?
Why is it used?
And can we implement it ourselves?

## What is Garbage Collection?

Very broadly, garbage collection is the process by which a run system of a programming language automatically frees memory no longer being used by the program.
Therefore, garbage collection is a form of automatic memory management.
This is in contrast to manual memory management<label for="sidenote--sn2" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn2" class="margin-toggle"/><span class="sidenote">
How do you know if your programming language requires manual memory management or if memory is managed automatically? If you're asking this question, memory is being managed automatically. Or you're writing some very bad C code.
</span>
Essentially, whenever you allocate memory during program evaluation, that memory needs to be freed somehow.
In languages where you manually manage memory (like C), you have to manually free the memory.
For example<label for="sidenote--sn3" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sidenote--sn3" class="margin-toggle"/><span class="sidenote">
And yes, I am very well aware of the fact that this code is not good C code.
</span>:

```c
int* my_int = (int*)malloc(sizeof(int));
my_int = 10;
printf("my_int: %d\n", *my_int);
...
free(my_int);
```

Since we dynamically allocate memory for `my_int`, we need to free it.

Now instead consider Python.
In Python, this code would be:

```python
my_int = 10
print(f"my_int: {my_int}")
```

Here, we don't need to manually free `my_int`.
So where does the memory go?
Does Python just grow to use infinite memory?
Nope.

This is where garbage collection comes in.
Since the run system for Python is garbage collected, a garbage collector comes in and automatically frees memory that is no longer being used.

### History of Garbage Collection

### What Languages Use Garbage Collection and Why?

So by now we know that not all languages use garbage collection.
So, which ones do use garbage collection?
Usually, garbage collection is much more commonly used in scripting languages and in languages that dynamically allocate memory more frequently.

For example, languages that use garbage collection include:

- Python
- JavaScript
- Go
- C#

Why do they use garbage collection?
The primary reason is that it makes it much easier for the programmer.
For one, it's simply more convenient for the programmer to not have to manually free memory.
Programmers can write code and create objects and not have to pepper `free` statements through their code.

Going beyond that, however, garbage collection also helps prevent certain types of errors, such as:

- **Use after free errors**
- **Dangling pointers**
- **Double free bugs**
- **Memory leaks**

### What Languages Do NOT Use Garbage Collection and Why Not?

There are some situations when you tend to NOT want to use garbage collection.
Those situations include cases when you have severe memory limitations, when you need to ensure that program evaluation does not stall for garbage collection, when you need to ensure code runs quickly and efficiently, etc.

Languages that don't use garbage collection include:

- C
- C++
- Rust

Why don't they use garbage collection?
Many reasons:

- **Memory overhead**
- **Worse performance**
- **Unpredictable program stalls**
- **Lack of control over location of memory allocation**

## How Does Garbage Collection Work (Very Broadly)

Very generally, garbage collection works by checking when objects are no longer able to be used by a program and then automatically freeing up that memory.
There are many different strategies for finding which objects can no longer be used and different strategies for discarding garbage.
These include:

- **Tracing**
- **Reference counting**
- **Stop and copy**

## Tl;dr

Garbage collection finds which objects are no longer able to be used by the program and automatically frees that garbage.
It is commonly used in scripting languages since it makes it easier to write programs and avoid certain types of bugs.
However, it also requires substantial overhead, impacts performance, and can lead to unpredictable program stalling and memory allocation.
