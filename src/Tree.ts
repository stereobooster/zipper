import { List } from "./List";

export type Tree<T> = {
  value: T;
  children: List<Tree<T>>;
} | null;

type ZipperPath<T> = {
  left: List<Tree<T>>;
  top: ZipperPath<T>;
  right: List<Tree<T>>;
} | null;

export type TreeZipper<T> = {
  // pointer to an arc, null means top
  path: ZipperPath<T>;
  // tree at given arc
  focus: Tree<T>;
};

/**
 * List(T) = T * List(T) + 1
 * List(T) = 1 / (1 - T)
 * 
 * Tree(T) = T * List(Tree(T)) + 1
 * Tree(T) = T / (1 - Tree(T)) + 1
 */