# Zipper

Zipper is a:

- persistent data structure
- means of "navigation" through another data structure with ability to "change" it on the go (without changing the origina structure), similar to [functional optics](https://www.oreilly.com/library/view/hands-on-functional-programming/9781788831437/d83ecfbf-6713-450e-9e90-8f02253427bf.xhtml).

Zipper was proposed (invented?) by G'erard Huet in 1997. You can read his original paper - [Functional Pearl. The Zipper](https://www.st.cs.uni-saarland.de/edu/seminare/2005/advanced-fp/docs/huet-zipper.pdf), 1997.

> Almost every programmer has faced the problem of representing a tree together with a subtree that is the focus of attention, where that focus may move left, right, up or down the tree. The Zipper is Huet’s nifty name for a nifty data structure which fulfills this need. I wish I had known of it when I faced this task, because the solution I came up with was not quite so efficient or elegant as the Zipper.

Initially Huet proposed Zipper as the way to work with trees (specifically in the context of functional programming, where instead of mutations you need to use persistent data structures).

Later Conor McBride realized that idea of the Zipper can be generalized and used other data structures (not just trees). You can read his original paper - [The Derivative of a Regular Type is its Type of One-Hole Contexts](http://strictlypositive.org/diff.pdf), 2009.

And even more he proposed that derivative of type for data structure gives type of the one hole context for the given data structure (e.g. zipper without focus).

## Zipper for Linked List

Let's start with the Zipper for linked list. Linked list is simpler data structure than tree. Here is a type for linked list:

```
List(T) = T * List(T) + 1
```

Here I use algebraic data type notation:

- `List(T)` - parametrised type, in terms of TypeScript it would be `List<T>`
- `A * B` - product type, in terms of TypeScript it could be tupple `[A, B]` or object `{first: A, second: B}`
- `A + B` - sum type, in terms of TypeScript `A | B`
- `1` is a type with one value, in many language this is type which contains single value `null`. In Lisp they use empty tuple for null `()`

Final type of List in TypeScript:

```ts
type List<T> = {
  value: T;
  next: List<T>;
} | null;
```

Derivative of `List(T)` is `List(T) * List(T)`. Which would correspond to left and right context e.g. values before focus and values after focus (or "hole"). So Zipper for linked list would be:

```
ListZipper(T) = List(T) * T * List(T)
```

Or in terms of TypeScript:

```ts
type ListZipper<T> = {
  left: List<T>;
  focus: T;
  right: List<T>;
};
```

We can define two direction for navigation: left and right.

```ts
const left = <T>(zipper: ListZipper<T>): ListZipper<T> => {
  return {
    left: zipper.left.next,
    focus: zipper.left.value,
    right: cons(zipper.focus, zipper.right),
  };
};

const right = <T>(zipper: ListZipper<T>): ListZipper<T> => {
  return {
    left: cons(zipper.focus, zipper.left),
    focus: zipper.right.value,
    right: zipper.right.next,
  };
};
```

## Understnading Zipper - vizualization

I had trouble understanding Zippers. So I decided to do vizualization for the Zipper, to grasp the concept - https://zipper-huet.netlify.app/.

## History

- Implemented linked list and zipper for it
- Implemented vizaulization using `react-archer`
- Implemented narry tree and (Huet's) zipper for it
- Implemented vizualization using Graphviz
- Implemented vizualization for "cycled" tree (detection of loops)
- Implemented parsing with zippers
- Extended "parsing with zippers" with:
  - Kleene star (`Rep`) - tree for it is similar to `Seq`
    - Didn't implemented Kleene plus (`+`) and optional (`?`), because I was lazy instead use `Alt`
  - lexical nodes (`Lex`) - when parsed derivation tree is replaced by single node with matched value
  - ignored nodes (`Ign`) - when parsed derivation tree is replaced by empty string node
- Added DSL for grammar
  - Including `letrec`-like function to handle creation of cycles. OCaml provide this function ability out of the box, for JS I had to do some hacks
- Extended "parsing with zippers" with tree compaction
  - All nodes except terminals and labeleled non-terminal are removed from parse tree
- Implemented "grammar grammar" e.g. grammar to parse BNF-like grammar
- Implemented playground for "parsing with zippers"
  - User can provide grammar and string and use controls to experiment, observe how parsing happens
- Realized that my Narry-tree and Huet zipper implementation is cumbersome
  - I wanted to make it "by the book" e.g. to show that zipper indeed can be implemented as McBride derivtive and that this exact zipper can be used for parsing (with zipper). It indeed works, but it is very hard to maintain this codebase
  - So I chnaged implementation to LCRS tree and zipper which treats LCRS tree as Narry tree (not as binary tree). It is not by the book, but it is easier for me to handle
- Added vizualization of `Mem` for "parsing with zippers". For now it shows only one-level parents from mem and edges due to `Mem`. I can't use memoization because `Mem` is mutable structure
  - Still consider adding vizualization of `results` from `Mem` and displaying empty (fake) nodes for `TopC`
- Added different UI improvements, like
  - Ability to select node to show "legend" e.g. details about node: label, value, top, left, right, etc..
  - Ability to highlight nodes when other controls are hovered - to easily identify which node is related to this control
  - Ability to jump to specific derivation cycle. This makes debuging so much easier I whould have done this earlier
  - Animation between cycles
  - Pink arrows where zipper will move next (this feature needs more work)

## Next

- I still a bit fuzzy on how exactly `Mem` works. I get general idea, but when I tried to implement PwZ without memoization table and I got confused. So probably it makes sense to continue improving vizaulization for `Mem`
  - As soon as I will understand it better I can implement PwZ without memoization table
- I want to experiment with [Conjuctive grammar](https://github.com/stereobooster/derp/blob/main/docs/Conjunctive%20grammar.md), [REwLA](https://github.com/stereobooster/derp/blob/main/docs/Regular%20expressions%20with%20lookahead.md) or [PEG](https://github.com/stereobooster/derp/blob/main/docs/PEG.md) parsing with zippers
  - `Conjuctive` should be possible, because `&` behaves same as `|` (`Alt`) except it matched only if all branches are matched
  - `REwLA` is problematic because lookahed can "spill" over the current tree. I'm not sure what to do about it
    - I can "bubble up" lookahed node in the tree
    - Or maybe I can put it in `Mem` somehow
  - `PEG`
    - [Reference paper](https://arxiv.org/pdf/1808.08893.pdf) is confuising
    - If I would be able to implement `REwLA` I can use is to parse `PEG`
- I wonder if it is possible to modify PwZ to produce [Shared Packed Parse Forest](https://lark-parser.readthedocs.io/en/latest/_static/sppf/sppf.html) instead of list of trees
- Extend "Grammar grammar" to support `Ign` and `Lex`
- Better error message should take in account `Ign` and `Lex`
- Collect more "interesting" examples of grammars

### Small bugs and unsorted noted

- "Grammar grammar"
  - Use `[]` for character classes
  - Does it support c-escaped characters
  - convert multi-character strings (`"..."`) to `Seq` of `Tok`
- Jump over "borring" steps (1 step, zipper didn't move)
- vizualization
  - hover on "next step button" doesn't highlight active zipper after click
  - add ability to collapse graph by click on node
    - show mem graph (collapsed by default)
    - Collapse `lex` nodes on click
    - Semi-transparent `ign` nodes
  - allow to highlight nodes and/or edges
    - for example to show all nodes with `mem`
    - for example to show focus/zipper instead of using dot-medium for that
  - use same colors, shapes, labels for `NodeButton` as for node
  - add "URL state" so that any state of derivative could be shared
  - animation is problematic because zipper changes id of node on movement
  - alternative vizualization library
    - https://js.cytoscape.org/
      - https://github.com/plotly/react-cytoscapejs
      - https://blog.js.cytoscape.org/2020/05/11/layouts/#layout-definition
      - https://www.npmjs.com/package/cytoscape-dagre
    - https://visjs.github.io/vis-network/examples/
      - https://crubier.github.io/react-graph-vis/
    - https://github.com/vasturiano/react-force-graph
    - https://sim51.github.io/react-sigma/docs/example/layouts
    - https://github.com/antvis/Graphin
    - https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/ etc.
    - https://d3-graph-gallery.com/network.html
- LCRSZipper
  - hide implementation details (`children`, `loop`)
  - Expression vs Zipper types
- refactor shared variables (`mems`, `memoInput`, `treeCompaction`)
- `ign` doesn't work inside `lex`
- `alt(["\n", "\r\n"])` ambigious, because second treated as set, not as sequence
- `Warning: no value for width of non-ASCII character 207. Falling back to width of space character`
- Kleene plus and other quantifiers
- Ignore consequent space without parsing?
- Fix display "Zipper + tree"
  - need to change order in which nodes (and edges ?) are printed out. Topological sort?
- refactor list vizualization to use the same viz as tree
  - `[React Archer] Could not find target element! Not drawing the arrow.`
- BUG: Zipper for a "cycled tree" in "LCRS tree" mode - sometimes draws double edges
  - but this problem is fixed in LCRS tree implementation
- Mention combinatorial species

## Other

- https://github.com/stereobooster/parsing-with-derivalives
- https://github.com/stereobooster/derp
