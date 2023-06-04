import { List, cons, unwind } from "./List";
import { Tree } from "./Tree";

// https://youtu.be/HqHdgBXOOsE?t=490
export type TreeZipper<T, P = Tree<T>> = {
  left: List<P>;
  right: List<P>;
  up: List<{ left: List<P>; value: T; right: List<P> }>;
  focus: P;
  // alternatively
  // focus: T;
  // down: List<P>;
};

export const treeToZipper = <T>(tree: Tree<T>): TreeZipper<T> => {
  return {
    left: null,
    right: null,
    up: null,
    focus: tree,
  };
};

const treeNode = <T>(value: T, children: List<Tree<T>>): Tree<T> => ({
  value,
  children,
});

export const right = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.right === null || zipper.right.value === null) return zipper;
  return {
    left: cons(zipper.focus, zipper.left),
    right: zipper.right.next,
    up: zipper.up,
    focus: zipper.right.value,
  };
};

export const left = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.left === null || zipper.left.value === null) return zipper;
  return {
    left: zipper.left.next,
    right: cons(zipper.focus, zipper.right),
    up: zipper.up,
    focus: zipper.left.value,
  };
};

export const down = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.focus === null || zipper.focus.children === null) return zipper;
  const children = zipper.focus.children;
  return {
    left: null,
    right: children.next,
    up: cons(
      { left: zipper.left, value: zipper.focus.value, right: zipper.right },
      zipper.up
    ),
    focus: children.value,
  };
};

export const up = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.up === null) return zipper;
  return {
    left: zipper.up.value.left,
    right: zipper.up.value.right,
    up: zipper.up.next,
    focus: treeNode(
      zipper.up.value.value,
      // this is not contant time operation
      unwind(zipper.left, zipper.focus, zipper.right)
    ),
  };
};

// draw zipper on the graph
// add ids to tree, so it would be possible to change value
// add explantion about logical and memory
// fix warning: No script tag of type "javascript/worker" was found and "useWorker" is true. Not using web worker.
// fix warning: [React Archer] Could not find target element! Not drawing the arrow.

/**
 * TODO:
 * BTree(T) = 1 +  T * BTree(T) * BTree(T)
 * ContextBtree(T) = List(2 * x * BTree(T)) * BTree(T) * BTree(T)
 */

// https://en.wikipedia.org/wiki/Left-child_right-sibling_binary_tree
// aka Knuth's tree
// type LCRSTree<T> = {
//   value: T;
//   right: LCRSTree<T>; // aka sibling
//   down: LCRSTree<T>; // aka left, child
// } | null;
