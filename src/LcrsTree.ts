import {
  grayColor,
  leftColor,
  listColor,
  rightColor,
  zipperColor,
} from "./common";

export type ID = number;
const getId = (): ID => Math.random();

// Tree ----------------------------------------------------------------------------

export type LcrsTree<T> = {
  id: ID;
  value: T;
  // "Right-sibling"
  right: LcrsTreePath<T>;
  // "Left-child"
  down: LcrsTreePath<T>;
  // for compatibility with zipper
  up: null;
  left: null;
};

export type LcrsTreePath<T> = LcrsTree<T> | null;

// The same as Multi-way tree, but with JS arrays
export type NarryTree<T> = [T, Array<NarryTree<T>>];

type PartialLcrsTree<T> = Omit<LcrsTree<T>, "id"> & {
  id?: ID;
};
export const treeNode = <T>(props: PartialLcrsTree<T>): LcrsTree<T> => ({
  ...props,
  id: getId(),
});

export const narryToLcrsTree = <T>(
  [value, children]: NarryTree<T>,
  right: Array<NarryTree<T>> = []
): LcrsTree<T> =>
  treeNode({
    value: value,
    right:
      right.length === 0 ? null : narryToLcrsTree(right[0], right.slice(1)),
    down:
      children.length === 0
        ? null
        : narryToLcrsTree(children[0], children.slice(1)),
    up: null,
    left: null,
  });

// Zipper ----------------------------------------------------------------------------

export type LcrsZipper<T> = {
  id: ID;
  value: T;
  right: LcrsZipperPath<T>;
  down: LcrsZipperPath<T>;
  up: LcrsZipperPath<T>;
  left: LcrsZipperPath<T>;
  originalId?: ID;
};

export type LcrsZipperPath<T> = LcrsZipper<T> | null;

export const treeToZipper = <T>(tree: LcrsTree<T>): LcrsZipper<T> => tree;

type PartialLcrsZipper<T> = Omit<LcrsZipper<T>, "id"> & {
  id?: ID;
};
export const node = <T>({
  originalId,
  id,
  ...props
}: PartialLcrsZipper<T>): LcrsZipper<T> => ({
  ...props,
  id: getId(),
  originalId: originalId || id,
});

export const right = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  if (zipper.right === null) throw new Error("Can't move right");
  return node({
    ...zipper.right,
    up: zipper.up,
    left: node({ ...zipper, right: null, up: null }),
  });
};

export const left = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  if (zipper.left === null) throw new Error("Can't move left");
  return node({
    ...zipper.left,
    up: zipper.up,
    right: node({ ...zipper, left: null, up: null }),
  });
};

export const down = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  if (zipper.down === null) throw new Error("Can't move down");
  return node({
    ...zipper.down,
    up: node({ ...zipper, down: null }),
  });
};

export const leftEnd = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  while (zipper.left !== null) zipper = left(zipper);
  return zipper;
};

export const up = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  if (zipper.up === null) throw new Error("Can't move up");
  return node({
    ...zipper.up,
    down: node({ ...leftEnd(zipper), up: null }),
  });
};

export const replace = <T>(zipper: LcrsZipper<T>, value: T): LcrsZipper<T> => {
  return node({
    ...zipper,
    value,
  });
};

// Vizualization ----------------------------------------------------------------------------

type Level = number;
type Edge = {
  from: ID;
  to: ID;
  type?: "zipper" | "green" | "blue" | "gray" | "invisible";
  // https://graphviz.org/docs/attrs/dir/
  direction?: "forward" | "backward";
  // https://graphviz.org/docs/attrs/constraint/
  constraint?: boolean;
};
// TODO: remove value, add level
type Node = {
  level: Level;
  id: ID;
  type?: "green" | "blue" | "empty" | "focus" | "gray";
  zipper?: boolean;
};
type Trie = Record<ID, Record<ID, Edge>>;
type Display = {
  logicalEdges: Trie;
  memoryEdges: Trie;
  ranks: Record<ID, Level>;
  nodes: Record<ID, Node>;
  zipperNodes: Record<ID, LcrsZipper<unknown>>;
};

const addToTrie = (trie: Trie, edge: Edge) => {
  if (!trie[edge.from]) trie[edge.from] = {};
  trie[edge.from][edge.to] = edge;
};

const addNode = (
  display: Display,
  node: Node,
  zipperNode: LcrsZipper<unknown>
) => {
  display.nodes[node.id] = node;
  display.ranks[node.id] = node.level;
  display.zipperNodes[node.id] = zipperNode;
};

const addEdge = (
  display: Display,
  logical: boolean | number,
  memory: boolean | number,
  edge: Edge
) => {
  if (logical) addToTrie(display.logicalEdges, edge);
  if (memory) addToTrie(display.memoryEdges, edge);
};

const forEach = <T, P>(
  direction: "left" | "right" | "up" | "down",
  zipper: LcrsZipperPath<T>,
  cb: (x: LcrsZipper<T>) => P
) => {
  while (zipper !== null) {
    cb(zipper);
    zipper = zipper[direction];
  }
};

const forEachPair = <T, P>(
  direction: "left" | "right" | "up" | "down",
  zipper: LcrsZipperPath<T>,
  cb: (current: LcrsZipper<T>, next: LcrsZipper<T>) => P,
  initial?: LcrsZipper<T>
) => {
  let current = initial !== undefined ? initial : (zipper as LcrsZipper<T>);
  const iterOver =
    initial !== undefined ? zipper : (zipper as LcrsZipper<T>)[direction];
  forEach(direction, iterOver, (next) => {
    cb(current, next);
    current = next;
  });
};

const forEachRight = <T, P>(
  zipper: LcrsZipperPath<T>,
  cb: (current: LcrsZipper<T>, next: LcrsZipper<T>) => P,
  initial?: LcrsZipper<T>
) => forEachPair("right", zipper, cb, initial);

const forEachLeft = <T, P>(
  zipper: LcrsZipperPath<T>,
  cb: (current: LcrsZipper<T>, next: LcrsZipper<T>) => P,
  initial?: LcrsZipper<T>
) => forEachPair("left", zipper, cb, initial);

export const traverseLcrsTree = <T>(
  tree: LcrsTreePath<T>,
  display: Display = {
    logicalEdges: {},
    memoryEdges: {},
    ranks: {},
    nodes: {},
    zipperNodes: {},
  },
  level = 0
) => {
  if (tree === null) return display;
  // loop detection
  if (display.nodes[tree.id]) return display;
  const { id } = tree;
  addNode(display, { id, level }, tree);
  forEachRight(
    tree.down,
    (from, to) => {
      addEdge(display, 1, 0, { from: tree.id, to: to.id });
      if (tree !== from)
        addEdge(display, 1, 0, { from: from.id, to: to.id, type: "invisible" });
      addEdge(display, 0, 1, { from: from.id, to: to.id });
      traverseLcrsTree(to as LcrsTree<T>, display, level + 1);
    },
    tree
  );
  return display;
};

const edgeToDot = ({ from, to, type, direction, constraint }: Edge) => {
  const dir = direction === "backward" ? "dir=back" : "";
  let color = listColor;
  let borderWidth = 1;
  let arrow = "";
  if (type === "zipper") {
    borderWidth = 4;
    color = zipperColor;
    arrow = "arrowhead=none arrowtail=none";
  } else if (type === "blue") {
    color = leftColor;
  } else if (type == "green") {
    color = rightColor;
  } else if (type === "gray") {
    color = grayColor;
  } else if (type === "invisible") {
    return `${from} -> ${to} [style=invis]`;
  }
  return `${from} -> ${to} [penwidth=${borderWidth} ${arrow} ${dir} color="${color}" ${
    constraint === false ? "constraint=false" : ""
  }]`;
};

const nodeToDot = (
  id: ID | string,
  { type, zipper }: Node,
  zipperNode: LcrsZipper<unknown>
) => {
  let borderColor = listColor;
  let fillColor = listColor;
  let fontcolor = "white";

  if (type === "empty") {
    fillColor = "white";
    borderColor = "white";
  } else if (type === "focus") {
    fillColor = "white";
    fontcolor = "black";
  } else if (type === "green") {
    fillColor = rightColor;
    borderColor = rightColor;
  } else if (type === "blue") {
    fillColor = leftColor;
    borderColor = leftColor;
  } else if (type === "gray") {
    fillColor = grayColor;
    borderColor = grayColor;
  }

  if (zipper) {
    borderColor = zipperColor;
  }

  let label = zipperNode.value as string;
  // https://graphviz.org/doc/info/shapes.html
  const shape = label.length <= 1 ? "square" : "rect";

  label = label.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

  return `${id} [penwidth=4 style="filled,solid,rounded" label="${label}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}]`;
};

const levelsDot = (ranks: Record<ID, Level>) => `{
  node [style=invis];
  edge [style=invis];
  ${[...new Set(Object.values(ranks))].sort((a, b) => a - b).join(" -> ")}
}`;

const ranksDot = (ranks: Record<ID, Level>) => {
  const res = {} as Record<Level, ID[]>;
  Object.entries(ranks).forEach(([k, v]) => {
    if (!res[v]) res[v] = [];
    res[v].push(k as any);
  });
  return Object.entries(res)
    .map(([k, v]) => `{ rank = same ; ${k} ; ${v.join(" ; ")} }`)
    .join("\n");
};

const nodesDot = (
  nodes: Record<ID, Node>,
  zipperNodes: Record<ID, LcrsZipper<unknown>>
) =>
  Object.entries(nodes)
    .map(([id, node]) => nodeToDot(id, node, zipperNodes[id as any]))
    .join("\n");

const edgesDot = (edges: Trie) =>
  Object.values(edges)
    .flatMap((toEdges) => Object.values(toEdges))
    .map(edgeToDot)
    .join("\n");

const toDot = (
  { logicalEdges, memoryEdges, ranks, nodes, zipperNodes }: Display,
  logical = false
) => {
  const x = `
    ${levelsDot(ranks)}
    ${ranksDot(ranks)}
    ${nodesDot(nodes, zipperNodes)}
    ${edgesDot(logical ? logicalEdges : memoryEdges)}
  `.trim();
  // console.log(x);
  return x;
};

export const treeToDot = <T>({
  logical,
  tree,
}: {
  logical: boolean;
  tree: LcrsTree<T>;
}) =>
  `digraph {
    node [fontcolor=white fixedsize=true height=0.3]
    edge [color="${listColor}"]
    ${toDot(traverseLcrsTree(tree), logical)}
  }`.trim();

// ---

const memoizeWeak = <K extends object, V>(cb: (input: K | null) => V) => {
  const memo = new WeakMap<K, V>();
  return (input: K | null) => {
    if (input === null) return cb(input);
    if (memo.has(input)) return memo.get(input) as V;
    const result = cb(input);
    memo.set(input, result);
    return result;
  };
};

const getLevel = memoizeWeak((zipper: LcrsZipperPath<unknown>): number => {
  if (zipper === null) return 0;
  return getLevel(zipper.up) + 1;
});

type LcrsZipperDisplay = {
  focus: LcrsZipper<unknown>;
  focusUp: LcrsZipperPath<unknown>;
  focusRight: LcrsZipperPath<unknown>;
  focusLeft: LcrsZipperPath<unknown>;
  meta: WeakMap<LcrsZipper<unknown>, { level: number }>;
};

/**
 * Zipper is immutable, so functions over ziperrs are perfect candidates for memoization.
 * Function can return array of "display items", then iterative call would do flatMap,
 * but the same time it should detect loop.
 * Display item can be: node, array of outgoing edges
 * Then we iterate over "display items" to create display
 * - index by level
 * - index by id
 * - or I can directly convert display item to dot
 * - or instead of display item I can return Zipper node and metadata (level, for example collect in WeakMap)
 */
export const traverseLcrsZipper = <T>(
  zipper: LcrsZipperPath<T>,
  display: Display = {
    logicalEdges: {},
    memoryEdges: {},
    ranks: {},
    nodes: {},
    zipperNodes: {},
  },
  givenLevel?: number,
  givenType?: "green" | "blue",
  zipperTraverse = false
) => {
  if (!zipper) return display;
  // loop detection
  if (display.nodes[zipper.id]) return display;

  const isFocus = givenLevel === undefined;
  const level = isFocus ? getLevel(zipper) : givenLevel;
  const { id, originalId } = zipper;
  let type = originalId ? givenType : undefined;
  addNode(
    display,
    {
      level,
      id,
      zipper: isFocus,
      type: isFocus ? "focus" : type,
    },
    zipper
  );

  if (zipper.up) {
    traverseLcrsZipper(zipper.up, display, level - 1, "blue", true);
    addEdge(display, 1, 1, {
      from: zipper.id,
      to: zipper.up.id,
      type: isFocus ? "zipper" : "blue",
    });
    // TODO: remove mutation
    if (isFocus) display.nodes[zipper.up.id].zipper = true;
  }

  if (zipper.left) {
    type = zipper.originalId ? givenType || "blue" : undefined;
    const edge = {
      from: zipper.left.id,
      to: zipper.id,
      direction: "backward",
    } as const;
    addEdge(display, 1, 0, {
      ...edge,
      type: isFocus ? "zipper" : zipperTraverse ? type : "invisible",
    });
    addEdge(display, 0, 1, {
      ...edge,
      type: isFocus ? "zipper" : type,
    });
    traverseLcrsZipper(zipper.left, display, level, type, isFocus || zipperTraverse);
    // TODO: remove mutation
    if (isFocus) display.nodes[zipper.left.id].zipper = true;
  }

  if (zipper.right) {
    type = zipper.originalId ? givenType || "green" : undefined;
    const edge = { from: zipper.id, to: zipper.right.id };
    addEdge(display, 1, 0, {
      ...edge,
      type: isFocus ? "zipper" : zipperTraverse ? type : "invisible",
    });
    addEdge(display, 0, 1, {
      ...edge,
      type: isFocus ? "zipper" : type,
    });
    traverseLcrsZipper(zipper.right, display, level, type, isFocus || zipperTraverse);
    // TODO: remove mutation
    if (isFocus) display.nodes[zipper.right.id].zipper = true;
  }

  if (zipper.down) {
    type = zipper.originalId ? givenType || "green" : undefined;
    addEdge(display, 1, 1, {
      from: zipper.id,
      to: zipper.down.id,
      type,
    });
    forEach("right", zipper.down, (to) => {
      addEdge(display, 1, 0, { from: zipper.id, to: to.id, type });
    });
    traverseLcrsZipper(zipper.down, display, level + 1, type, false);
  }

  return display;
};

export const lcrsZipperToDot = <T>({
  logical,
  zipper,
}: {
  logical: boolean;
  zipper: LcrsZipper<T>;
}) =>
  `digraph {
    node [fontcolor=white fixedsize=true height=0.3]
    edge [color="${listColor}"]
    ${toDot(traverseLcrsZipper(zipper), logical)}
  }`.trim();
