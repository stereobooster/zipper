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
- Added vizualization of `Mem` for "parsing with zippers".
  - Not very helpfull to be fair
- Added different UI improvements, like
  - Ability to select node to show "legend" e.g. details about node: label, value, top, left, right, etc..
  - Ability to highlight nodes when other controls are hovered - to easily identify which node is related to this control
  - Ability to jump to specific derivation cycle. This makes debuging so much easier I whould have done this earlier
  - Animation between cycles
  - Pink arrows where zipper will move next
- Display compaction (not the same as tree compaction)
  - It removes all duplicate nodes and changes edges to point to de-duped nodes.
    - Node is duplicate if it has the same `originalId`, `start` and `end` and same children (after de-duplication)
  - This is very similar to [Shared Packed Parse Forest](https://lark-parser.readthedocs.io/en/latest/_static/sppf/sppf.html), except this representation doesn't have ambiguation-nodes
    - It hints how to implement transformation of the result to SPPF
  - If it is possible to compact final result, it means that **memoization doesn't fully work**. It memoizes some nodes, but not all of them
    - Which means that either I messed up implementation
    - Or that it works the same in the original paper
  - The compaction algorithm is a total mess
- Added lookahed operators
  - Similar operators exist in [PEG](https://github.com/stereobooster/derp/blob/main/docs/PEG.md) and [Regular Expressions](https://github.com/stereobooster/derp/blob/main/docs/Regular%20expressions%20with%20lookahead.md): `&` - positive, `!` - negative
  - I use: `~` - positive, `!` - negative
  - But PEGs end of file (EOF) `!.` needs special treatment (not implemented)
  - Current algorithm is a mess. Idea is:
    - to mark each zipper with id
    - if there is lookahead operator it is produce two independent zippers - for one for lookahed and one for main derivation. Connection between them is stored (through ids)
    - Derivation of zippers continue independently, but if lookahead matched or unmatched, it will preserve or remove main zippers
  - lookahead operators allows to specify **context-sensitive** languages, for example $a^nb^nc^n$
  - I can express PEGs ordered choice (`/`) using lookahed
  - Lookahed with cycle doesn't work

## Next

- I still a bit fuzzy on how exactly `Mem` works. I get general idea, but when I tried to implement PwZ without memoization table I got confused. So probably it makes sense to continue improving vizaulization for `Mem`
  - As soon as I will understand it better I can implement PwZ without memoization table
- I want to experiment with [Conjuctive grammar](https://github.com/stereobooster/derp/blob/main/docs/Conjunctive%20grammar.md) or [PEG](https://github.com/stereobooster/derp/blob/main/docs/PEG.md) parsing with zippers
  - `Conjuctive` should be possible, because `&` behaves same as `|` (`Alt`) except it matches only if all branches are matches
  - `PEG`
    - [Reference paper](https://arxiv.org/pdf/1808.08893.pdf) is confuising
- I wonder if it is possible to modify PwZ to produce SPPF instead of list of trees
  - Potentially connected to multiple focus zippers
- Extend "Grammar grammar" to support `Ign` and `Lex`
- Better error message should take in account `Ign` and `Lex`
- Collect more "interesting" examples of grammars
- Backreferences, capturing groups

### Small bugs and unsorted notes

- add min, max to `Rep` and use it to express different quantifiers
  - `*` min: 0, max: inf
  - `+` min: 1, max: inf
  - `?` min: 0, max: 1
  - `{n,m}` min: n, max: m
  - `{n,}` min: n, max: inf
  - `{n}` min: n, max: n
- `!` vs `^`
- `~` vs `Ign`, `Ign` = non-capturing group?
- BUG: `N -> "a";` can't detect end of derivation
- Mem visualization
  - draw mem for selected node?
  - draw `m-results`?
  - draw `m-parents` full?
  - add ability to collapse graph by click on node
    - show mem graph (collapsed by default)
    - Collapse `lex` nodes on click
    - Semi-transparent `ign` nodes
- Jump over "borring" steps (1 step, zipper didn't move)
- Next zipper movement vizualisation
  - it is sometimes not obvious why next move will remove zipper, for example, in case when it's loop e.g. the same node was already derived with the given token
- Bug: legend for compacted tree doesn't show info about other (hidden) nodes
- Bug: `A-> "a" "b"; S -> A? A;`, `A -> A "a" | ""; S -> A? A;`
- vizualization
  - highlight all edges and nodes of the selected zipper
  - bug: hover on "next step button" doesn't highlight active zipper after click
  - hovering on zipper node - highlight button in `Direction and depth`
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
- "Grammar grammar" doesn't support codepoints
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
- [Memoized zipper-based attribute grammars and their higher order extension](https://www.sciencedirect.com/science/article/pii/S016764231830412X)
- [Recognising and Generating Terms using Derivatives of Parsing Expression Grammars](https://arxiv.org/pdf/1801.10490.pdf)

### Notation

|                                          | Notation   | Node type | Language/Set |
| ---------------------------------------- | ---------- | --------- | ------------ |
| concatenation or sequence                | ` `        | Seq       | $\cdot$      |
| union or unordered choice or disjunction | \|         | Alt       | $\cup$       |
| token or terminal                        | `"x"`      | Tok       |              |
| symbol or non-terminal                   | `x`        | 1         |              |
| Kleene star                              | `*`        | Rep       | $\ast$       |
| Kleene plus                              | `+`        | 2         |              |
| optional                                 | `?`        | 3         |              |
| any character                            | `.`        | 4         | $\Sigma$     |
| range                                    | ❗`[a-z]`  | 4         | ❌           |
| set of characters                        | ❗`[abc]`  | 4         | ❌           |
| negation of set                          | ❗`[^abc]` | 4         | ❌           |
| escaped character                        | ❗`"\n"`   | ❗        | ❌           |
| character classes                        | ❗`\w, \d` | ❗        | ❌           |
| ignored                                  | ❗         | 5, Ign    | ❌           |
| lexeme                                   | ❗         | 6, Lex    | ❌           |
| positive lookahead                       | 7, `~`     | ❗Pla     |              |
| negative lookahead                       | `!`        | ❗Nla     |              |
| negation or complement                   | ❗         |           |              |
| ordered choice                           | `/`        |           |              |
| intersection or conjuction               | `&`        | ❗Int     | $\cap$       |

❗ - not implemented or not final
❌ - not applicable

1. Symbol expressed as a property of Node (Expression)
2. Kleene plus implemented using `Seq` and `Rep`. Can be impelemnted as separate node type
3. Optional implemented using `Alt` and and empty `Seq`. Can be impelemnted as separate node type
4. For not those are implemented using `Tok`. Notation need to be changed
5. Ingored implemented as separate Expression type, but could be as well property of Node (Expression). Not exposed in notation though
6. `Lexeme` makes parser scanerless. Not exposed in notation though
7. Which symbol to use for PLA: `@` `#` `$` `%` `=` `>` `~` `_`? In PEG they use `&`, but I wont to use it for intersection. `+` is used for Kleene plus. Maybe use `{}`, to avoid situations when you need to use `()`, like `~(a b) c` or `(~a) b`?

### Interesting grammars

```
S -> S & "a";
```

empty set

```
X -> a X b;
Y -> b Y c;
S -> X c* & a* Y;
```

`aabbcc`

### Memoization

Memoization used for detecting loops (recursion, breaking infinite loop), for example, grammar like this `S -> S "a";` (left recursion) would cause infinite loop otherwise. When loop is detected it will return bottom value (empty set).

> That is why they put something in the memo table before deriving

Memoization used for memoizing `results` if the same expression is derived by the same token (position). For example, `A -> "a"; S -> A "b" | A "c";` Alternation (`|`) splits ziiper into N separate zippers (for each branch) which are derived independently. It will derivate first zipper by token `0`, then second zipper by token `0`, etc...

> That is why they memoize `results` and do this by position

In trivial case (concatenation) you need to memoize only one result, but because alternation splits zipper there can be more than one result.

> That is why `results` is an array

**But** I can't come up with an example where we would need `results` as array or store `parents` without recursion.

Grammar: `A -> A "a" | ""; S -> A A;`, string: `aa`

When deriving `A` by the first letter (position: 0) it can have different parents (3 - because length of input is 2):

- `S`
- `S -> A -> Seq`
- `S -> A -> Seq -> A -> Seq`

And different results:

- `""`
- `Seq (A -> "", "a")`
- Won't be results until we get the second letter: `Seq (Seq ("a", A -> ""), ?)`
