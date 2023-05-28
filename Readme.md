# Zipper

Zipper is a:

- persistent data structure
- means of "navigation" through another data structure with ability to "change" it on the go (without changing the origina structure), similar to [functional optics](https://www.oreilly.com/library/view/hands-on-functional-programming/9781788831437/d83ecfbf-6713-450e-9e90-8f02253427bf.xhtml).

Zipper was proposed (invented?) by G'erard Huet in 1997. You can read his original paper - [Functional Pearl. The Zipper](https://www.st.cs.uni-saarland.de/edu/seminare/2005/advanced-fp/docs/huet-zipper.pdf), 1997.

> Almost every programmer has faced the problem of representing a tree together with a subtree that is the focus of attention, where that focus may move left, right, up or down the tree. The Zipper is Huet’s nifty name for a nifty data structure which fulfills this need. I wish I had known of it when I faced this task, because the solution I came up with was not quite so efficient or elegant as the Zipper.

Initially Huet proposed Zipper as the way to work with trees (specifically in the context of functional programming, where instead of mutations you need to use persistent data structures).

Later Conor McBride realized that idea of the Zipper can be generalized and used other data structures (not just trees). You can read his original paper - [The Derivative of a Regular Type is its Type of One-Hole Contexts](http://strictlypositive.org/diff.pdf), 2009.

And even more he proposed that derivative of type for data structure gives type of the zipper for the given data structure.

## Zipper for Linked List

Let's start with the Zipper for linked list. Linked list is simpler data structure than tree. Here is a type for linked list:

```
List(X) = X * List(X) + 1
```

Here I use algebraic data type notation:

- `List(X)` - parametrised type, in terms of TypeScript it would be `List<X>`
- `A * B` - product type, in terms of TypeScript it could be tupple `[A, B]` or object `{first: A, second: B}`
- `A + B` - sum type, in terms of TypeScript `A | B`
- `1` is a type with one value, in many language this is type which contains single value `null`. In Lisp they use empty tuple for null `()`

Final type of List in TypeScript:

```ts
export type List<T> = {
  value: T;
  next: List<T>;
} | null;
```

Derivative of `List(X)` is `List(X) * List(X)`. Which would correspond to prefix and suffix e.g. values before focus and values after focus (or "hole"). So Zipper for linked list would be:

```
ListZipper(X) = List(X) * X * List(X)
```

Or in terms of TypeScript:

```ts
ListZipper<T> = {
  prefix: List<T>,
  focus: T,
  suffix: List<T>,
};
```

We can define two direction for navigation: left and right.

```ts
const left = <T>(zipper: ListZipper<T>): ListZipper<T> => {
  return {
    prefix: zipper.prefix.next,
    focus: zipper.prefix.value,
    suffix: cons(zipper.focus, zipper.suffix),
  };
};

const right = <T>(zipper: ListZipper<T>): ListZipper<T> => {
  return {
    prefix: cons(zipper.focus, zipper.prefix),
    focus: zipper.suffix.value,
    suffix: zipper.suffix.next,
  };
};
```

## Understnadin Zipper - vizualization

I had trouble understanding Zippers. So I decided to do vizualization for the Zipper, to grasp the concept...

TODO: put a link to the webpage
