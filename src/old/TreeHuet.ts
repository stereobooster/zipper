import { List, cons, unwind } from "../List";

// type tree =
//     Item of item
//     | Section of tree list;;
export type HuetTree<T> =
  | {
      type: "item";
      value: T;
    }
  | {
      type: "section";
      children: List<HuetTree<T>>;
    };

// https://www.st.cs.uni-saarland.de/edu/seminare/2005/advanced-fp/docs/huet-zipper.pdf
// type path =
//  Top
//  | Node of tree list * path * tree list;;
type HuetZipperPath<T> = {
  left: List<T>;
  up: HuetZipperPath<T>;
  right: List<T>;
} | null;

// type location = Loc of tree * path;;
export type HuetTreeZipper<T, P = HuetTree<T>> = {
  // pointer to an arc, null means top
  path: HuetZipperPath<P>;
  // tree at given arc
  focus: P;
};

export const treeToZipper = <T>(tree: HuetTree<T>): HuetTreeZipper<T> => ({
  focus: tree,
  path: null,
});

export const down = <T>(zipper: HuetTreeZipper<T>): HuetTreeZipper<T> => {
  // other way would be to throw an Error
  const { focus } = zipper;
  if (focus.type === "item") return zipper;
  if (focus.children === null) return zipper;
  return {
    focus: focus.children.value,
    path: {
      left: null,
      right: focus.children.next,
      up: zipper.path,
    },
  };
};

export const right = <T>(zipper: HuetTreeZipper<T>): HuetTreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.path === null || zipper.path.right === null) return zipper;
  return {
    path: {
      left: cons(zipper.focus, zipper.path.left),
      right: zipper.path.right.next,
      up: zipper.path.up,
    },
    focus: zipper.path.right.value,
  };
};

export const left = <T>(zipper: HuetTreeZipper<T>): HuetTreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.path === null || zipper.path.left === null) return zipper;
  return {
    path: {
      left: zipper.path.left.next,
      right: cons(zipper.focus, zipper.path.right),
      up: zipper.path.up,
    },
    focus: zipper.path.left.value,
  };
};

export const up = <T>(zipper: HuetTreeZipper<T>): HuetTreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.path === null) return zipper;
  return {
    path: zipper.path.up,
    focus: {
      type: "section",
      // NOTE: this is not a constant time operation
      // Section((rev left) @ (t::right))
      children: unwind(zipper.path.left, zipper.focus, zipper.path.left),
    },
  };
};
