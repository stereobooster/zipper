import { arrayToList, forEach } from "./List";
import { List } from "./List";

export type NarryTree<T> = [T, Array<NarryTree<T>>];

const merge = <T>(a: Record<number, T[]>, b: Record<number, T[]>) => {
  const c = { ...a } as Record<any, T[]>;
  Object.entries(b).forEach(([k, v]) => {
    if (c[k] === undefined) {
      c[k] = v;
    } else {
      c[k] = [...new Set([...c[k], ...v])];
    }
  });
  return c as Record<number, T[]>;
};

const traverseNarryTree = <T>(narryTree: NarryTree<T>, level = 1) => {
  let logicalEdges = [] as Array<[T, T]>;
  let memoryEdges = [] as Array<[T, T]>;
  let ranks = {} as Record<number, T[]>;

  const from = narryTree[0];
  const to = narryTree[1];
  ranks[level] = [from];

  let prevFrom = from;

  to.forEach((nt: NarryTree<T>) => {
    logicalEdges.push([from, nt[0]]);
    memoryEdges.push([prevFrom, nt[0]]);
    prevFrom = nt[0];
    const {
      logicalEdges: le,
      memoryEdges: me,
      ranks: r,
    } = traverseNarryTree(nt, level + 1);
    logicalEdges = [...logicalEdges, ...le];
    memoryEdges = [...memoryEdges, ...me];
    ranks = merge(ranks, r);
  });

  return { logicalEdges, memoryEdges, ranks };
};

const listColor = `"#8b0000"`;

export const toDot = <T>(
  edges: Array<[T, T]>,
  ranks: Record<number, Array<T>>
) => {
  const levelNumbers = Object.keys(ranks);
  const rstring = Object.entries(ranks)
    .map(([k, v]) => `{ rank = same ; ${k} ; ${v.join(" ; ")} }`)
    .join("\n");
  const treeDot = edges.map(([a, b]) => `${a} -> ${b};`).join("\n");

  return `
    digraph {
      {
        node [shape=plaintext fontcolor=white];
        edge [color=white]
        ${levelNumbers.join(" -> ")}
      }
      node [fixedsize=true width=0.3 height=0.3 shape=circle fontcolor=white color=${listColor} style=filled]
      edge [color=${listColor}]
      ${rstring}
      ${treeDot}
    }
  `.trim();
};

export const narryTreeToDot = <T>(narryTree: NarryTree<T>, logical = false) => {
  const { logicalEdges, memoryEdges, ranks } = traverseNarryTree(narryTree);
  return toDot(logical ? logicalEdges : memoryEdges, ranks);
};

export type Tree<T> = {
  value: T;
  children: List<Tree<T>>;
} | null;

const traverseTree = <T>(tree: Tree<T>, level = 1) => {
  let logicalEdges = [] as Array<[T, T]>;
  let memoryEdges = [] as Array<[T, T]>;
  let ranks = {} as Record<number, T[]>;

  if (!tree) return { logicalEdges, memoryEdges, ranks };

  const from = tree.value;
  const to = tree.children;
  ranks[level] = [from];

  let prevFrom = from;

  forEach(to, (t) => {
    if (!t) return;
    logicalEdges.push([from, t.value]);
    memoryEdges.push([prevFrom, t.value]);
    prevFrom = t.value;
    const {
      logicalEdges: le,
      memoryEdges: me,
      ranks: r,
    } = traverseTree(t, level + 1);
    logicalEdges = [...logicalEdges, ...le];
    memoryEdges = [...memoryEdges, ...me];
    ranks = merge(ranks, r);
  });

  return { logicalEdges, memoryEdges, ranks };
};

export const treeToDot = <T>(tree: Tree<T>, logical = false) => {
  const { logicalEdges, memoryEdges, ranks } = traverseTree(tree);
  return toDot(logical ? logicalEdges : memoryEdges, ranks);
};

export const narryTreeToTree = <T>(narryTree: NarryTree<T>): Tree<T> => ({
  value: narryTree[0],
  children: arrayToList(narryTree[1].map(narryTreeToTree)),
});

// TODO
// figure out type for Zipper
// draw zipper on the graph
// add ids to tree, so it would be possible to change value
// add explantion about logical and memory
// fix warning: No script tag of type "javascript/worker" was found and "useWorker" is true. Not using web worker.
// fix warning: [React Archer] Could not find target element! Not drawing the arrow.

type ZipperPath<T> = {
  left: List<Tree<T>>;
  top: ZipperPath<T>;
  right: List<Tree<T>>;
} | null;

/**
 * List(T) = T * List(T) + 1
 * List(T) = 1 / (1 - T)
 *
 * Tree(T) = T * List(Tree(T)) + 1
 * Tree(T) = T / (1 - Tree(T)) + 1
 */
export type TreeZipper<T> = {
  // pointer to an arc, null means top
  path: ZipperPath<T>;
  // tree at given arc
  focus: Tree<T>;
};
