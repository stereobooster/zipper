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

## TODO other derivatives

- [Conjuctive grammar](https://github.com/stereobooster/derp/blob/main/docs/Conjunctive%20grammar.md)
  - `&` should behave the same as `Alt` except it matches only when there are matches for each children
- [REwLA](https://github.com/stereobooster/derp/blob/main/docs/Regular%20expressions%20with%20lookahead.md)
  - `!` should behave the same as `ALt`, but the problem is that it can spill over the current tree
    - so I can either store it somehow in mem
    - or move node higher in the tree
- [PEG](https://github.com/stereobooster/derp/blob/main/docs/PEG.md)
  - https://arxiv.org/pdf/1808.08893.pdf

## TODO

- Tried to implement PwZ without memoization table, but failed miserably
  - Authors store `start` and `end` in `mem`, but I store those in tree nodes. Maybe I can get something out of this
- PwZ can work as [scannerless](https://en.wikipedia.org/wiki/Scannerless_parsing) parser (parser generator)
  - The only thing that we need to add is ability to specify [lexical grammar](https://spoofax.dev/references/sdf3/lexical-syntax/) separately from syntactical grammar.
    - There are different ways, for example:
      - I can add special nodes (`lex`), which are when matched (e.g. moves zipper up through node) would collapse tree underneath and store string value in the node
      - Or I can add special flag to nodes (`lex: true`), which would work the same as separate node, but without need to introduce separate node
    - In order to capture string value I can:
      - accumulate input string and use `start`, `end` to slice required part frrom accumulated input
      - or use `Mem` to accumulate string
    - What to do if there are nested lexical nodes?
      - I think it is reasonable to collapse tree to the highest lexical node.

TODO:

- PwZ without memoization table?
- vizualization
  - show mem edges (purple, constraint false)
    - but don't traverse mem, only show first node (mem-parent)
  - add ability to collapse graph by click on node
    - show mem-parents graph collapsed by default
  - enable animation of nodes and edges on zipper change?
  - use CSS modules insted of style
  - use same colors, shapes, labels for `NodeButton` as for node
  - allow to highlight nodes and/or edges
    - for example to show all nodes with `mem`
    - for example to show focus/zipper instead of using dot-medium for that
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
  - left-edge of focus is wrong color
  - do memoization if there is no loop
  - it doesn't show original tree
- "Jump" button - derivate until number of steps change 1 -> N, N -> 1
- Improve parsing error messages
- refactor shared variables (`mems`, `memoInput`, `treeCompaction`)
- Tree compaction
  - document and test
- `ign` doesn't work inside `lex`
- `alt(["\n", "\r\n"])` ambigious, because second treated as set, not as consequence
- `Warning: no value for width of non-ASCII character 207. Falling back to width of space character`
- Kleene plus and other quantifiers
- Compact display of grammar
  - Collapse `lex` nodes on click
  - Semi-transparent `ign` nodes
- Ignore consequent space without parsing?
- Problem of disappering zippers in PwZ vizualization
  - [Shared Packed Parse Forest](https://lark-parser.readthedocs.io/en/latest/_static/sppf/sppf.html) vs list of zippers
- Fix display "Zipper + tree"
  - need to change order in which nodes (and edges ?) are printed out. Topological sort?
- BUG: Zipper for a "cycled tree" in "LCRS tree" mode - sometimes draws double edges
- Mention combinatorial species
- refactor list vizualization to use the same viz as tree
  - `[React Archer] Could not find target element! Not drawing the arrow.`

## Other

- https://github.com/stereobooster/parsing-with-derivalives
- https://github.com/stereobooster/derp
