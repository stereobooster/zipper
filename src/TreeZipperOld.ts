import { List, cons, unwind } from "./List";
import { Tree } from "./Tree";

// https://youtu.be/HqHdgBXOOsE?t=490
export type TreeZipper<T> = {
  left: List<Tree<T>>;
  right: List<Tree<T>>;
  up: List<{ left: List<Tree<T>>; value: T; right: List<Tree<T>> }>;
  focus: T;
  down: List<Tree<T>>;
};

export const treeToZipper = <T>(tree: Tree<T>): TreeZipper<T> => {
  if (!tree) throw new Error("Empty tree");
  return {
    left: null,
    right: null,
    up: null,
    focus: tree.value,
    down: tree.children,
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
    left: cons(treeNode(zipper.focus, zipper.down), zipper.left),
    right: zipper.right.next,
    up: zipper.up,
    focus: zipper.right.value.value,
    down: zipper.right.value.children,
  };
};

export const left = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.left === null || zipper.left.value === null) return zipper;
  return {
    left: zipper.left.next,
    right: cons(treeNode(zipper.focus, zipper.down), zipper.right),
    up: zipper.up,
    focus: zipper.left.value.value,
    down: zipper.left.value.children,
  };
};


export const down = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.down === null || zipper.down.value === null) return zipper;
  const headChildren = zipper.down.value;
  const tailChildren = zipper.down.next;
  return {
    left: null,
    right: tailChildren,
    up: cons(
      { left: zipper.left, value: zipper.focus, right: zipper.right },
      zipper.up
    ),
    focus: headChildren.value,
    down: headChildren.children,
  };
};

export const up = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.up === null) return zipper;
  return {
    left: zipper.up.value.left,
    right: zipper.up.value.right,
    up: zipper.up.next,
    focus: zipper.up.value.value,
    down: unwind(zipper.left, treeNode(zipper.focus, zipper.down), zipper.right),
  };
};
