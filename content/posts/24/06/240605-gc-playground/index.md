---
title: Cheney's Algorithm Playground
summary: The Garbage Collector We Wrote, Running in the Browser
template: page
path:
    -   name: Posts
        link: /posts
    -   name: Cheney's Algorithm Playground
        link: /posts/24/06/240605-gc-playground/
        self: true
series:
    name: Garbage Collection
    link: /posts/series/gc
---

Here's a live demo of the Cheney's algorithm code we wrote [here](../../05/240527-semispace-gc-code/)!
The full code can be found on [GitHub here](https://github.com/ellifteria/cheneys-gc.js).

<script src="/scripts/cheneys-gc.js/GCLib.js"></script>
<script src="/scripts/cheneys-gc.js/cheneys-gc.js"></script>

<script src="/scripts/cheneys-gc.js/index.js"></script>

<textarea style="padding: 10px; max-width: 100%; line-height: 1.5; border-radius: 5px; border: 1px solid #ccc; box-shadow: 1px 1px 1px #999; font-family: Consolas, Menlo, Courier, monospace;" id="collectorCode" rows="20" cols="100">let collector = new TwoSpaceCopyingCollector(20);
let ptr1 = collector.allocate({tag: "flat", value: 1}, true);
console.log(ptr1);
let ptr2 = collector.allocate({tag: "flat", value: 2});
console.log(ptr2);
collector.allocate({tag: "cons", root1: ptr1, root2: ptr2});
console.log(collector.heap.data);
collector.allocate({tag: "flat", value: 3}, true);
console.log(collector.heap.data);</textarea>

<button type="button" style="background-color: #111; border: none; color: #f8f8f8; padding: 16px 32px; text-decoration: none; margin: 4px 2px; cursor: pointer;" onclick="runCollector()">Run</button>

<pre><code class="language-shell" id="loggerOutput"></code></pre>
