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

## TODO

- Added positions (`start`, `end`) to tree nodes
- Tried to implement PwZ without memoization table, but failed miserably
  - Authors store `start` and `end` in `mem`, but I store those in tree nodes. Maybe I can get something out of this

TODO:

- [Lexical](https://spoofax.dev/references/sdf3/lexical-syntax/) nodes
- Parser for a simplified "grammar"
- Problem of disappering zippers in PwZ vizualization
  - [Shared Packed Parse Forest](https://lark-parser.readthedocs.io/en/latest/_static/sppf/sppf.html) vs list of zippers
- Tree compaction
- Fix display "Zipper + tree"
  - need to change order in which nodes (and edges ?) are printed out. Topological sort?
- BUG: Zipper for a "cycled tree" in "LCRS tree" mode - sometimes draws double edges
- Mention combinatorial species
- refactor list vizualization to use the same viz as tree
  - `[React Archer] Could not find target element! Not drawing the arrow.`

## Other

- https://github.com/stereobooster/parsing-with-derivalives
- https://github.com/stereobooster/derp
