import { arrayToList } from "./List";
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

export type NarryTree<T> = [T, Array<NarryTree<T>>];

const narryTreeToTree = <T>(narryTree: NarryTree<T>): Tree<T> => ({
  value: narryTree[0],
  children: arrayToList(narryTree[1].map(narryTreeToTree)),
});

// export const sampleTree = narryTreeToTree(sampleNarryTree);

const traverseNarryTree = <T extends string | number | symbol>(
  narryTree: NarryTree<T>,
  level = 1
) => {
  let levels = {} as Record<T, number>;
  let logicalEdges = [] as Array<[T, T]>;
  let physicalEdges = [] as Array<[T, T]>;
  // let ranks = {} as Record<number, Array<T>>;

  const from = narryTree[0];
  const to = narryTree[1];
  levels[from] = level;
  // ranks[level] = [from]

  let prevFrom = from;

  to.forEach((nt: NarryTree<T>) => {
    logicalEdges.push([from, nt[0]]);
    physicalEdges.push([prevFrom, nt[0]]);
    prevFrom = nt[0];
    const {
      levels: l,
      logicalEdges: le,
      physicalEdges: pe,
      // ranks: r,
    } = traverseNarryTree(nt, level + 1);
    levels = { ...levels, ...l };
    logicalEdges = [...logicalEdges, ...le];
    physicalEdges = [...physicalEdges, ...pe];
    // ranks = deepMerge(ranks, r)
  });

  return { levels, logicalEdges, physicalEdges };
};

const listColor = `"#8b0000"`;

export const narryTreeToDot = <T>(narryTree: NarryTree<T>, logical = false) => {
  const { levels, logicalEdges, physicalEdges } = traverseNarryTree(
    narryTree as NarryTree<string>
  );

  const levelNumbers = [...new Set(Object.values(levels))].sort();
  const ranks = {} as Record<number, Array<string>>;
  Object.entries(levels).map(([k, v]) => {
    ranks[v] = ranks[v] || [];
    ranks[v].push(k);
  });
  const rstring = Object.entries(ranks)
    .map(([k, v]) => `{ rank = same ; ${k} ; ${v.join(" ; ")} }`)
    .join("\n");

  const treeDot = logical
    ? logicalEdges.map(([a, b]) => `${a} -> ${b};`).join("\n")
    : physicalEdges.map(([a, b]) => `${a} -> ${b};`).join("\n");

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
  `;
};
