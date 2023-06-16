import { arrayToList, List } from "./List";

export type ID = number;
export type Level = number;

// ListTree, Multi-way tree
export type Tree<T> = {
  value: T;
  children: List<Tree<T>>;
  // for vizualization
  id: ID;
  level: Level;
  originalId?: ID;
} | null;

// The same as Multi-way tree, but with JS arrays
export type NarryTree<T> = [T, Array<NarryTree<T>>];

export const treeNode = <T>({
  originalId,
  id,
  ...props
}: {
  value: T;
  children: List<Tree<T>>;
  level: Level;
  originalId?: ID;
  id?: ID;
}): Tree<T> => ({
  ...props,
  originalId: originalId !== undefined ? originalId : id,
  id: Math.random(),
});

export const narryTreeToTree = <T>(
  narryTree: NarryTree<T>,
  level = 1
): Tree<T> =>
  treeNode({
    value: narryTree[0],
    children: arrayToList(
      narryTree[1].map((t) => narryTreeToTree(t, level + 1))
    ),
    level,
  });
