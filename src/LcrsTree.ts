import {
  grayColor,
  leftColor,
  listColor,
  purpleColor,
  rightColor,
  zipperColor,
} from "./colors";
import { ExpressionValue } from "./lcrsPwz";
import { memoizeWeak, memoizeWeakChain } from "./memoization";

export type ID = string;
// this suppose to be valid CSS id selector
const getId = (): ID => `${Math.random()}`.replaceAll("0.", "n");

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

// Key difference from classical Zipper is that it modifies node immediately on navigation,
// but classical Zipper modifies node only when navigates away
// this can be changed if I move `down` and `right` inside of `value`
export type LcrsZipper<T> = {
  id: ID;
  value: T;
  right: LcrsZipperPath<T>;
  down: LcrsZipperPath<T>;
  up: LcrsZipperPath<T>;
  left: LcrsZipperPath<T>;
  originalId?: ID;
  prevId?: ID;
  // classical N-arry tree uses list, but in this case tree-node itslef is a list-node
  // so if there is a loop, there is no way to put recursive node in the tree without modifying it
  // so in order to fix we insert one additional special-node to make it possible to do the loop
  // without modifying the original node
  // this node is omitted in zipper movements
  loop?: boolean;
};

export type LcrsZipperPath<T = unknown> = LcrsZipper<T> | null;

export const treeToZipper = <T>(tree: LcrsTree<T>): LcrsZipper<T> => tree;

export type PartialLcrsZipper<T = unknown> = Partial<LcrsZipper<T>> & {
  value: T;
};

let prevIdMemo: Set<ID> | undefined;
const getPrevId = (id: ID | undefined, prevId: ID | undefined) => {
  if (!prevId || !id || !prevIdMemo) return id;
  if (prevIdMemo.has(prevId)) return prevId;
  prevIdMemo.add(id);
  return id;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export const prevIdTransaction = <T extends Function>(cb: T): T =>
  ((...x: any) => {
    prevIdMemo = new Set();
    const res = cb(...x);
    prevIdMemo = undefined;
    return res;
  }) as any;

export const node = <T>({
  originalId,
  id,
  prevId,
  ...props
}: PartialLcrsZipper<T>): LcrsZipper<T> => ({
  up: null,
  left: null,
  right: null,
  down: null,
  ...props,
  id: getId(),
  prevId: getPrevId(id, prevId),
  originalId: originalId || id,
});

export const replace = <T>(zipper: LcrsZipper<T>, value: T): LcrsZipper<T> =>
  node({
    ...zipper,
    value,
  });

export const right = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  if (zipper.right === null) throw new Error("Can't move right");
  if (zipper.right.loop)
    return node({
      ...zipper.right.down!,
      right: zipper.right.right,
      up: zipper.up,
      left: node({ ...zipper, right: null, up: null }),
    });
  return node({
    ...zipper.right,
    up: zipper.up,
    left: node({ ...zipper, right: null, up: null }),
  });
};

export const down = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  if (zipper.down === null) throw new Error("Can't move down");
  if (zipper.down.loop)
    return node({
      ...zipper.down.down!,
      right: zipper.down.right,
      up: node({ ...zipper, down: null }),
    });
  return node({
    ...zipper.down,
    up: node({ ...zipper, down: null }),
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

export const leftEnd = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  while (zipper.left !== null) zipper = left(zipper);
  return zipper;
};

// maybe go up without rewind?
export const up = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  if (zipper.up === null) throw new Error("Can't move up");
  return node({
    ...zipper.up,
    down: node({ ...leftEnd(zipper), up: null }),
  });
};

// this treats item as a node
export const insertAfter = <T>(zipper: LcrsZipper<T>, item: LcrsZipper<T>) =>
  node({
    ...zipper,
    right: node({ ...item, right: zipper.right, left: null, up: null }),
  });

const concatLeft = <T>(left: LcrsZipperPath<T>, right: LcrsZipper<T>) => {
  forEach("right", right, (x) => {
    left = node({
      ...x,
      right: null,
      up: null,
      left,
    });
  });
  return left;
};

// this treats item as a list
export const insertBefore = <T>(zipper: LcrsZipper<T>, item: LcrsZipper<T>) =>
  node({
    ...zipper,
    left: concatLeft(zipper.left, item),
  });

export const deleteBefore = <T>(zipper: LcrsZipper<T>) =>
  node({
    ...zipper,
    left: zipper.left?.left || null,
  });

export const deleteAfter = <T>(zipper: LcrsZipper<T>) =>
  node({
    ...zipper,
    right: zipper.right?.right || null,
  });

export const forEach = <T, P>(
  direction: "left" | "right" | "up" | "down",
  zipper: LcrsZipperPath<T>,
  cb: (x: LcrsZipper<T>) => P
) => {
  while (zipper !== null) {
    cb(zipper);
    zipper = zipper[direction];
  }
};

export const mapToArray = <T, P>(
  direction: "left" | "right" | "up" | "down",
  zipper: LcrsZipperPath<T>,
  cb: (x: LcrsZipper<T>) => P
) => {
  const res: P[] = [];
  while (zipper !== null) {
    res.push(cb(zipper));
    zipper = zipper[direction];
  }
  return res;
};

// to hide implementation details
export const mapChildren = <T, P>(
  zipper: LcrsZipperPath<T>,
  cb: (x: LcrsZipper<T>) => P
) =>
  mapToArray("right", zipper?.down || null, (x) =>
    cb({
      ...(x.loop ? x.down! : x),
      right: null,
    })
  );

// Vizualization ----------------------------------------------------------------------------

type Level = number;
export type NodeType = "green" | "blue" | "empty" | "focus" | "gray" | "purple";
export type Edge = {
  /* zipper & vizualisation */
  type?: "zipper" | "green" | "blue" | "gray" | "invisible" | "purple" | "pink";
  /* Graphviz */
  // https://graphviz.org/docs/attrs/dir/
  direction?: "forward" | "back";
  // https://graphviz.org/docs/attrs/constraint/
  constraint?: boolean;
  // https://graphviz.org/docs/attr-types/style/
  style?: "dotted";
  // https://graphviz.org/docs/attr-types/arrowType/
  arrowhead?: "inv" | "none" | "dot" | "normal";
  // This will only appear if the dir attribute is back or both.
  arrowtail?: "inv" | "none" | "dot" | "normal";
  strokeWidth?: number;
};

const pp = (name: string, value?: string | boolean | number) =>
  value === undefined ? "" : `${name}="${value}"`;

const edgeToDot = (
  from: ID,
  to: ID,
  {
    type,
    direction,
    constraint,
    style,
    arrowhead,
    arrowtail,
    strokeWidth,
  }: Edge
) => {
  if (direction == "back") {
    // from is always the same as node,
    // but when we draw left edges we need to flip them - so they would appear on the left side
    [from, to] = [to, from];
  }
  if (arrowhead !== undefined) {
    // special arrowhead for mem parents
    [from, to] = [to, from];
  }
  let color = listColor;
  if (type === "zipper") {
    strokeWidth = 4;
    color = zipperColor;
    arrowhead = "none";
    arrowtail = "none";
  } else if (type === "blue") {
    color = leftColor;
  } else if (type == "green") {
    color = rightColor;
  } else if (type === "gray") {
    color = grayColor;
    constraint = false;
  } else if (type === "purple") {
    color = purpleColor;
    constraint = false;
  } else if (type === "pink") {
    strokeWidth = 2;
    color = zipperColor;
  } else if (type === "invisible") {
    return `${from} -> ${to} [style=invis];`;
  }
  if (style === "dotted") {
    constraint = false;
    arrowhead = "none";
    arrowtail = "none";
  }
  const props = [
    pp("id", `${from}-${to}`),
    pp("color", color),
    pp("penwidth", strokeWidth),
    pp("constraint", constraint),
    pp("dir", direction),
    pp("style", style),
    pp("arrowhead", arrowhead),
    pp("arrowtail", arrowtail),
  ].filter(Boolean);
  return `${from} -> ${to} [${props.join(" ")}];`;
};

const nodeToDot = memoizeWeakChain(
  "",
  (
    { id, value, originalId, loop, down }: LcrsZipper<unknown>,
    type: NodeType
  ): string => {
    if (loop) {
      value = down?.value;
    }

    let borderColor = listColor;
    let fillColor = listColor;
    let fontcolor = "white";

    if (type === "empty") {
      fillColor = "white";
      borderColor = "white";
    } else if (type === "focus") {
      fillColor = "white";
      fontcolor = "black";
      borderColor = zipperColor;
    } else if (type === "green" && originalId) {
      fillColor = rightColor;
      borderColor = rightColor;
    } else if (type === "blue" && originalId) {
      fillColor = leftColor;
      borderColor = leftColor;
    } else if (type === "gray") {
      fillColor = grayColor;
      borderColor = grayColor;
    } else if (type === "purple") {
      fillColor = purpleColor;
      borderColor = purpleColor;
    }

    let label = `${value}`;
    // https://graphviz.org/doc/info/shapes.html
    const shape = label.length <= 1 ? "square" : "rect";
    label = label.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

    return `${id} [id=${id} penwidth=4 style="filled,solid,rounded" label="${label}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}];`;
  }
);

export const levelsDot = (index: NodesIndex) => `{
  node [style=invis];
  edge [style=invis];
  ${[...new Set(Object.values(index).map((x) => x.level))]
    .sort((a, b) => a - b)
    .join(" -> ")}
}`;

export const ranksDot = (index: NodesIndex) => {
  const res = Object.create(null) as Record<Level, ID[]>;
  Object.entries(index).forEach(([k, v]) => {
    if (!res[v.level]) res[v.level] = [];
    res[v.level].push(k as any);
  });
  return Object.entries(res)
    .map(([k, v]) => `{ rank = same ; ${k} ; ${v.join(" ; ")} }`)
    .join("\n");
};

export const getLevel = memoizeWeak(
  0,
  (zipper: LcrsZipperPath<unknown>): number => {
    if (zipper === null) return 0;
    return getLevel(zipper.up) + 1;
  }
);

export const addEdge = (edgeIndex: EdgeIndex, to: ID, edge: Edge) => {
  if (edgeIndex[to]) console.warn("Overwrite edge");
  edgeIndex[to] = edge;
};

const getEdges = (
  zipper: LcrsZipperPath<unknown>,
  givenType: Edge["type"],
  zipperTraverse = false
) => {
  // TODO: add support for zipper nodes/edges
  const isFocus = false;

  const dagEdges: EdgeIndex = Object.create(null);
  const lcrsEdges: EdgeIndex = Object.create(null);
  const memEdges: EdgeIndex = Object.create(null);

  if (zipper === null) return { dagEdges, lcrsEdges, memEdges };

  let type: Edge["type"];

  if (zipper.up) {
    if (givenType === "purple") {
      const edge: Edge = { type: "purple" };
      // memEdges ???
      addEdge(dagEdges, zipper.up.id, edge);
      addEdge(lcrsEdges, zipper.up.id, edge);
    } else {
      const edge: Edge = { type: "blue" };
      addEdge(dagEdges, zipper.up.id, edge);
      addEdge(lcrsEdges, zipper.up.id, edge);
    }
  }

  if (zipper.left) {
    type = zipper.originalId ? givenType || "blue" : undefined;
    const edge: Edge = { direction: "back" };
    addEdge(dagEdges, zipper.left.id, {
      ...edge,
      type: isFocus ? "zipper" : zipperTraverse ? type : "invisible",
    });
    addEdge(lcrsEdges, zipper.left.id, {
      ...edge,
      type: isFocus ? "zipper" : type,
    });
  }

  if (zipper.right) {
    type = zipper.originalId ? givenType || "green" : undefined;
    addEdge(dagEdges, zipper.right.id, {
      type: isFocus ? "zipper" : zipperTraverse ? type : "invisible",
    });
    addEdge(lcrsEdges, zipper.right.id, {
      type: isFocus ? "zipper" : type,
    });
  }

  if (zipper.down) {
    type = zipper.originalId ? givenType || "green" : undefined;
    const down = zipper.down;
    if (zipper.loop) {
      const edge: Edge = {
        type,
        style: "dotted",

        direction: "back",
      };
      addEdge(dagEdges, down.id, edge);
      addEdge(lcrsEdges, down.id, edge);
    } else {
      mapToArray("right", zipper?.down, (to) =>
        addEdge(dagEdges, to.id, { type })
      );
      addEdge(lcrsEdges, down.id, { type });
    }
  }

  return { dagEdges, lcrsEdges, memEdges };
};

export const edgesToDot = memoizeWeakChain("", (edges: EdgeIndex, from: ID) =>
  Object.entries(edges)
    .map(([to, e]) => edgeToDot(from, to, e))
    .join("\n")
);

export type DisplayItem<T = unknown> = {
  level: Level;
  type: NodeType;
  zipper: LcrsZipper<T>;
  // I don't really need to store them separately because it would be the same as Edges stored on Node
  lcrsEdges: EdgeIndex;
  dagEdges: EdgeIndex;
  memEdges: EdgeIndex;
};
// Map would be faster than `{}`
export type EdgeIndex = Record<ID, Edge>;
export type NodesIndex<T = unknown> = Record<ID, DisplayItem<T>>;

const levelBottom = -1000000;

// maybe replace `type` with `direction`?
// Can we memoize zipper segment if it doesn't contain loop?
const traverseZipperMemo = memoizeWeakChain(
  {} as NodesIndex,
  (
    zipper: LcrsZipperPath<unknown>,
    type: NodeType,
    zipperTraverse = true,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    level: number = levelBottom,
    memo: NodesIndex = Object.create(null)
  ): NodesIndex => {
    if (!zipper) return Object.create(null);
    level = level === levelBottom ? getLevel(zipper) : level;
    if (memo[zipper.id] !== undefined) return Object.create(null);
    memo[zipper.id] = {
      level,
      zipper,
      type,
      ...getEdges(
        zipper,
        type === "focus" ? "green" : (type as any),
        zipperTraverse as boolean
      ),
    };

    const up = traverseZipperMemo(
      zipper.up,
      type === "focus" ? "blue" : type,
      zipperTraverse,
      level - 1
    );
    const left = traverseZipperMemo(
      zipper.left,
      type === "focus" ? "blue" : type,
      zipperTraverse,
      level
    );
    // @ts-expect-error need to add type
    const right = traverseZipperMemo.original(
      zipper.right,
      type === "focus" ? "green" : type,
      zipperTraverse,
      level,
      memo
    );
    // @ts-expect-error need to add type
    const down = traverseZipperMemo.original(
      zipper.down,
      type === "focus" ? "green" : type,
      false,
      zipper.loop ? level - getLevel(zipper.down) - 1 : level + 1,
      memo
    );

    return { ...up, ...left, ...memo, ...right, ...down };
  }
);

export const traverseZipper = <T = unknown>(
  zipper: LcrsZipperPath<T>,
  type: NodeType,
  mem = false,
  zipperTraverse = true,
  level = levelBottom,
  memo: NodesIndex<T> = Object.create(null)
): NodesIndex<T> => {
  if (!zipper) return {};
  level = level === levelBottom ? getLevel(zipper) : level;

  if (memo[zipper.id] !== undefined) {
    // memo[zipper.id].level = Math.max(memo[zipper.id].level, level)
    return {};
  }

  memo[zipper.id] = {
    level,
    zipper,
    type,
    ...getEdges(
      zipper,
      type === "focus" ? "green" : (type as any),
      zipperTraverse as boolean
    ),
  };

  if (type === "purple" && mem) {
    memo[zipper.id].lcrsEdges = Object.create(null);
    memo[zipper.id].dagEdges = Object.create(null);
    memo[zipper.id].memEdges = Object.create(null);
    const v = zipper.value as ExpressionValue;
    if (v.m) {
      v.m.parents.forEach((p) => {
        if (p.up && memo[p.up.id]) {
          const memEdge: Edge = {
            type: "purple",
            constraint: false,
          };
          addEdge(memo[zipper.id].memEdges, p.up.id, memEdge);
        }
      });
    }
    return memo;
  }

  const up = traverseZipper(
    zipper.up,
    type === "focus" ? "blue" : type,
    mem,
    zipperTraverse,
    level - 1,
    memo
  );
  const left = traverseZipper(
    zipper.left,
    type === "focus" ? "blue" : type,
    mem,
    zipperTraverse,
    level,
    memo
  );
  const right = traverseZipper(
    zipper.right,
    type === "focus" ? "green" : type,
    mem,
    zipperTraverse,
    level,
    memo
  );
  const down = traverseZipper(
    zipper.down,
    type === "focus" ? "green" : type,
    mem,
    false,
    level + 1,
    // zipper.loop ? level - getLevel(zipper.down) - 1 : level + 1,
    // zipper.loop ? level : level + 1,
    memo
  );

  const v = zipper.value as ExpressionValue;
  if (v.m && mem) {
    v.m.parents.forEach((p) => {
      // same for left and right?
      if (p.up) {
        const memEdge: Edge = {
          type: "purple",
          constraint: false,
        };
        addEdge(memo[zipper.id].memEdges, p.up.id, memEdge);
        if (p.up.originalId !== undefined)
          traverseZipper(
            p.up,
            "purple",
            zipperTraverse,
            mem,
            level - 1,
            memo as NodesIndex<any>
          );
      }
    });
  }

  return { ...up, ...left, ...memo, ...right, ...down };
};

export const mergeNodesIndex = <T>(
  oldNI: NodesIndex<T>,
  newNI: NodesIndex<T>,
  cb?: (oldItem: DisplayItem<T>, newItem: DisplayItem<T>) => DisplayItem<T>
) => {
  Object.entries(newNI).forEach(([id, item]) => {
    if (!oldNI[id]) oldNI[id] = item;
    else
      oldNI[id] = {
        ...(cb ? cb(oldNI[id], item) : oldNI[id]),
        level: Math.max(oldNI[id].level, item.level),
      };
  });
};

export const lcrsZipperToDot = <T>({
  zippers,
  logical,
}: {
  zippers: LcrsZipper<T>[];
  logical: boolean;
}) => {
  const index: NodesIndex<T> = Object.create(null);
  zippers.forEach((zipper) => {
    const newIndex = traverseZipper(zipper, "focus");
    mergeNodesIndex(index, newIndex, (oldItem, newItem) =>
      oldItem.type === "purple" ? newItem : oldItem
    );
  });
  const graphPieces = Object.values(index).flatMap((x) => [
    nodeToDot(x.zipper, x.type),
    edgesToDot(logical ? x.dagEdges : x.lcrsEdges, x.zipper.id),
    edgesToDot(x.memEdges, x.zipper.id),
  ]);
  return {
    dot: `digraph {
    ${levelsDot(index)}
    node [fontcolor=white fixedsize=true height=0.3]
    edge [color="${listColor}"]
    ${ranksDot(index)}
    ${graphPieces.join("\n")}
  }`,
    index,
  };
};
