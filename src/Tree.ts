import { arrayToList, forEach, List } from "./List";

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

const listColor = `"#8b0000"`;

const toDot = <T>(edges: Array<[T, T]>, ranks: Record<number, Array<T>>) => {
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

// ListTree, Multi-way tree
export type Tree<T> = {
  value: T;
  children: List<Tree<T>>;
} | null;

// The same as Multi-way tree, but with JS arrays
export type NarryTree<T> = [T, Array<NarryTree<T>>];

export const narryTreeToTree = <T>(narryTree: NarryTree<T>): Tree<T> => ({
  value: narryTree[0],
  children: arrayToList(narryTree[1].map(narryTreeToTree)),
});

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
