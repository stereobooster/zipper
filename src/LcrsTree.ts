import {
  grayColor,
  leftColor,
  listColor,
  purpleColor,
  rightColor,
  zipperColor,
} from "./common";
import { ExpressionType, ExpressionValue, Step } from "./lcrsPwz";

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
// but classical Zipper modifies node only whne navigates away
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
  // without modifyin the original node
  // this node is omitted in zipper movements
  loop?: boolean;
};

export type LcrsZipperPath<T> = LcrsZipper<T> | null;

export const treeToZipper = <T>(tree: LcrsTree<T>): LcrsZipper<T> => tree;

export type PartialLcrsZipper<T> = Partial<LcrsZipper<T>> & {
  value: T;
};

export const node = <T>({
  originalId,
  id,
  ...props
}: PartialLcrsZipper<T>): LcrsZipper<T> => ({
  up: null,
  left: null,
  right: null,
  down: null,
  ...props,
  id: getId(),
  prevId: id,
  originalId: originalId || id,
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

// TODO: refactor replace
// const replace = <T>(zipper: LcrsZipper<T>, value: T): LcrsZipper<T> => {
//   return node({
//     ...zipper,
//     value,
//   });
// };

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

// export const chain = (
//   zipper: ExpressionZipper,
//   ...rest: Array<(x: ExpressionZipper) => ExpressionZipper>
// ) => {
//   let result = zipper;
//   for (const cb of rest) result = cb(result);
//   return result;
// };

// memoization ---
// options:
// WeakMap based, Map based
// Loop detection - bottom value
// original (unmemoized version)
// one, n-arguments

const memoizePlaceholder = Symbol();
const memoizeWeak = <K extends object | null, V, R extends Array<unknown>>(
  bottom: V,
  cb: (input: K, ...rest: R) => V
) => {
  const memo = new WeakMap<NonNullable<K>, V>();
  return (input: K, ...rest: R) => {
    if (input === null) return cb(input, ...rest);
    if (memo.has(input)) {
      const m = memo.get(input);
      return m === memoizePlaceholder ? bottom : (m as V);
    }
    memo.set(input, memoizePlaceholder as any);
    const result = cb(input, ...rest);
    memo.set(input, result);
    return result;
  };
};

const getChain = (obj: Record<any, any> | undefined, keys: any[]) => {
  if (!obj) return;
  let current = obj;
  for (const key of keys) {
    current = current[key];
    if (current === undefined) break;
  }
  return current;
};

const setChain = (
  obj: Record<any, any> | undefined,
  keys: any[],
  value: any
) => {
  if (!obj) obj = {};
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      current[key] = value;
    } else {
      current[key] = current[key] || {};
      current = current[key];
    }
  }
  return obj;
};

function memoizeWeakChain<K extends object | null, V, R extends Array<unknown>>(
  bottom: V,
  cb: (input: K, ...rest: R) => V
): (input: K, ...rest: R) => V {
  const memo = new WeakMap<NonNullable<K>, Record<any, any>>();
  const fn = (input: K, ...rest: R) => {
    if (input === null) return cb(input, ...rest);
    const m = getChain(memo.get(input), rest) as V;
    if (m === memoizePlaceholder) return bottom;
    // if (m !== undefined) return m;
    memo.set(input, setChain(memo.get(input), rest, memoizePlaceholder));
    const result = cb(input, ...rest);
    memo.set(input, setChain(memo.get(input), rest, result));
    return result;
  };
  fn.original = cb;
  return fn;
}

// Vizualization ----------------------------------------------------------------------------

type Level = number;
type Edge = {
  from: ID;
  to: ID;
  type?: "zipper" | "green" | "blue" | "gray" | "invisible" | "purple";
  // https://graphviz.org/docs/attrs/dir/
  direction?: "forward" | "backward";
  // https://graphviz.org/docs/attrs/constraint/
  constraint?: boolean;
  // https://graphviz.org/docs/attr-types/style/
  style?: "dotted";
};
type NodeType = "green" | "blue" | "empty" | "focus" | "gray" | "purple";

const edgeToDot = ({ from, to, type, direction, constraint, style }: Edge) => {
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
    constraint = false;
  } else if (type === "purple") {
    color = purpleColor;
    constraint = false;
  } else if (type === "invisible") {
    return `${from} -> ${to} [style=invis]`;
  }
  if (style === "dotted") {
    constraint = false;
    arrow = "arrowhead=none arrowtail=none";
  }
  return `${from} -> ${to} [id="${from}-${to}" penwidth=${borderWidth} ${arrow} ${dir} color="${color}" ${
    constraint === false ? "constraint=false" : ""
  } ${style ? `style=${style}` : ""}];`;
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

    // if (zipper) {
    //   borderColor = zipperColor;
    // }

    // tmp hack
    let label: string;
    // @ts-expect-error xxx
    if (value.label !== undefined) {
      // @ts-expect-error xxx
      label = value.label;
    }
    // @ts-expect-error xxx
    else if (value.value !== undefined) {
      // @ts-expect-error xxx
      label = value.value;
    } else {
      label = `${value}`;
    }

    // https://graphviz.org/doc/info/shapes.html
    const shape = label.length <= 1 ? "square" : "rect";

    label = label.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

    return `${id} [id=${id} penwidth=4 style="filled,solid,rounded" label="${label}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}];`;
  }
);

const levelsDot = (index: NodesIndex) => `{
  node [style=invis];
  edge [style=invis];
  ${[...new Set(Object.values(index).map((x) => x.level))]
    .sort((a, b) => a - b)
    .join(" -> ")}
}`;

const ranksDot = (index: NodesIndex) => {
  const res = {} as Record<Level, ID[]>;
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

const getEdges = (
  zipper: LcrsZipperPath<unknown>,
  givenType: Edge["type"],
  logical = false,
  zipperTraverse = false
) => {
  // TODO: add support for zipper nodes/edges
  const isFocus = false;

  const edges: Edge[] = [];
  if (zipper === null) return edges;

  let type: Edge["type"];

  if (zipper.up) {
    type = givenType === "purple" ? givenType : "blue";
    edges.push({ from: zipper.id, to: zipper.up.id, type });
  }

  if (zipper.left) {
    type = zipper.originalId ? givenType || "blue" : undefined;
    const edge = {
      from: zipper.left.id,
      to: zipper.id,
      direction: "backward",
    } as const;
    if (logical) {
      edges.push({
        ...edge,
        type: isFocus ? "zipper" : zipperTraverse ? type : "invisible",
      });
    } else {
      edges.push({ ...edge, type: isFocus ? "zipper" : type });
    }
  }

  if (zipper.right) {
    type = zipper.originalId ? givenType || "green" : undefined;
    const edge = { from: zipper.id, to: zipper.right.id };
    if (logical) {
      edges.push({
        ...edge,
        type: isFocus ? "zipper" : zipperTraverse ? type : "invisible",
      });
    } else {
      edges.push({
        ...edge,
        type: isFocus ? "zipper" : type,
      });
    }
  }

  if (zipper.down) {
    type = zipper.originalId ? givenType || "green" : undefined;
    const down = zipper.down;
    if (zipper.loop) {
      edges.push({
        from: down.id,
        to: zipper.id,
        type,
        style: "dotted",
      });
    } else {
      if (logical) {
        forEach("right", zipper.down, (to) => {
          edges.push({ from: zipper.id, to: to.id, type });
        });
      } else {
        edges.push({ from: zipper.id, to: down.id, type });
      }
    }
  }

  return edges;
};

const edgesToDot = memoizeWeakChain("", (edges: Edge[]) =>
  edges.map(edgeToDot).join("\n")
);

export type DisplayItem<T> = {
  level: Level;
  zipper: LcrsZipper<T>;
  type: NodeType;
  edges: Edge[];
  afterLoop?: boolean;
};
export type NodesIndex<T = unknown> = Record<ID, DisplayItem<T>>;

// maybe replace `type` with `direction`?
// Can we memoize zipper segment if it doesn't contain loop?
const zipperDotMemo = memoizeWeakChain(
  {} as NodesIndex,
  (
    zipper: LcrsZipperPath<unknown>,
    type: NodeType,
    logical: boolean,
    zipperTraverse = true,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    level: number = -1,
    memo: NodesIndex = {}
  ): NodesIndex => {
    if (!zipper) return {};
    level = level === -1 ? getLevel(zipper) : level;
    if (memo[zipper.id] !== undefined) return {};
    memo[zipper.id] = {
      level,
      zipper,
      type,
      edges: getEdges(
        zipper,
        type === "focus" ? "green" : (type as any),
        logical as boolean,
        zipperTraverse as boolean
      ),
    };

    const up = zipperDotMemo(
      zipper.up,
      type === "focus" ? "blue" : type,
      logical,
      zipperTraverse,
      level - 1
    );
    const left = zipperDotMemo(
      zipper.left,
      type === "focus" ? "blue" : type,
      logical,
      zipperTraverse,
      level
    );
    // @ts-expect-error need to add type
    const right = zipperDotMemo.original(
      zipper.right,
      type === "focus" ? "green" : type,
      logical,
      zipperTraverse,
      level,
      memo
    );
    // @ts-expect-error need to add type
    const down = zipperDotMemo.original(
      zipper.down,
      type === "focus" ? "green" : type,
      logical,
      false,
      zipper.loop ? level - getLevel(zipper.down) - 1 : level + 1,
      memo
    );

    return { ...up, ...left, ...memo, ...right, ...down };
  }
);

const zipperDot = (
  zipper: LcrsZipperPath<unknown>,
  type: NodeType,
  logical: boolean,
  zipperTraverse = true,
  level = -1,
  memo: NodesIndex = {}
): NodesIndex => {
  if (!zipper) return {};
  level = level === -1 ? getLevel(zipper) : level;

  if (memo[zipper.id] !== undefined) {
    // memo[zipper.id].level = Math.max(memo[zipper.id].level, level)
    return {};
  }

  memo[zipper.id] = {
    level,
    zipper,
    type,
    edges: getEdges(
      zipper,
      type === "focus" ? "green" : (type as any),
      logical as boolean,
      zipperTraverse as boolean
    ),
  };

  if (type === "purple") {
    memo[zipper.id].edges = [];
    const v = zipper.value as ExpressionValue;
    if (v.m) {
      v.m.parents.forEach((p) => {
        if (p.up && memo[p.up.id]) {
          memo[zipper.id].edges.push({
            from: zipper.id,
            to: p.up.id,
            type: "purple",
            constraint: false,
          });
        }
      });
    }
    return memo;
  }

  const up = zipperDot(
    zipper.up,
    type === "focus" ? "blue" : type,
    logical,
    zipperTraverse,
    level - 1,
    memo
  );
  const left = zipperDot(
    zipper.left,
    type === "focus" ? "blue" : type,
    logical,
    zipperTraverse,
    level,
    memo
  );
  const right = zipperDot(
    zipper.right,
    type === "focus" ? "green" : type,
    logical,
    zipperTraverse,
    level,
    memo
  );
  const down = zipperDot(
    zipper.down,
    type === "focus" ? "green" : type,
    logical,
    false,
    level + 1,
    // zipper.loop ? level - getLevel(zipper.down) - 1 : level + 1,
    // zipper.loop ? level : level + 1,
    memo
  );

  const v = zipper.value as ExpressionValue;
  if (v.m) {
    v.m.parents.forEach((p) => {
      // same for left and right?
      if (p.up) {
        memo[zipper.id].edges = [
          ...memo[zipper.id].edges,
          {
            from: zipper.id,
            to: p.up.id,
            type: "purple",
            constraint: false,
          },
        ];
        if (p.up.originalId !== undefined)
          zipperDot(p.up, "purple", logical, zipperTraverse, level - 1, memo);
      }
    });
  }

  return { ...up, ...left, ...memo, ...right, ...down };
};

export const lcrsZipperToDot = <T>({
  zippers,
  logical,
}: {
  zippers: LcrsZipper<T>[];
  logical: boolean;
}) => {
  const index: NodesIndex<T> = {};
  zippers.forEach((zipper) => {
    const newIndex = zipperDot(zipper, "focus", logical, true) as NodesIndex<T>;
    Object.entries(newIndex).forEach(([id, item]) => {
      if (!index[id]) index[id] = item;
      else
        index[id] = {
          ...(index[id].type === "purple" ? item : index[id]),
          level: Math.max(index[id].level, item.level),
        };
    });
  });
  const graphPieces = Object.values(index).flatMap((x) => [
    nodeToDot(x.zipper, x.type),
    edgesToDot(x.edges),
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

const expressionToDot = memoizeWeakChain(
  "",
  (
    {
      id,
      originalId,
      down,
      loop,
      value: { label, expressionType, value, m },
    }: LcrsZipper<ExpressionValue>,
    type: NodeType
  ): string => {
    if (loop) {
      label = down?.value.label as string;
      expressionType = down?.value.expressionType as ExpressionType;
      value = down?.value.value;
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
    } else if (type === "green" && originalId !== undefined) {
      fillColor = rightColor;
      borderColor = rightColor;
    } else if (type === "blue" && originalId !== undefined) {
      fillColor = leftColor;
      borderColor = leftColor;
    } else if (type === "gray" && originalId !== undefined) {
      fillColor = grayColor;
      borderColor = grayColor;
    } else if (type === "purple" && originalId !== undefined) {
      fillColor = purpleColor;
      borderColor = purpleColor;
    }
    if (loop) {
      fillColor = "white";
      fontcolor = "black";
    }
    // if (zipper) {
    //   borderColor = zipperColor;
    // }

    const short = true;
    if (value) {
      label = value;
    } else if (expressionType === "Seq" && down === null) {
      label = "ϵ";
    } else if (label === "") {
      if (expressionType === "SeqC" || expressionType === "Seq") {
        label = short ? "∙" : "Seq";
      } else if (expressionType === "Alt" || expressionType === "AltC") {
        label = short ? "∪" : "Alt";
      } else if (expressionType === "Rep" || expressionType === "RepC") {
        label = short ? "∗" : "Rep";
      }
    }
    // https://graphviz.org/doc/info/shapes.html
    const shape = label.length <= 1 ? "square" : "rect";
    label = label.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const rounded = !m;

    return `${id} [id=${id} penwidth=4 style="filled,solid${
      rounded ? ",rounded" : ""
    }" label="${label}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}]`;
  }
);

export const stepsToDot = ({
  steps,
  logical,
}: {
  steps: Step[];
  logical: boolean;
}) => {
  const index: NodesIndex<ExpressionValue> = {};
  steps.forEach(([, zipper, m]) => {
    
    const newIndex = zipperDot(
      zipper,
      "focus",
      logical,
      true
    ) as NodesIndex<ExpressionValue>;
    Object.entries(newIndex).forEach(([id, item]) => {
      if (!index[id]) index[id] = item;
      else
        index[id] = {
          ...(index[id].type === "purple" ? item : index[id]),
          level: Math.max(index[id].level, item.level),
        };
    });

    if (m) {
      m.parents.forEach((p) => {
        if (!p.up) return;
        const newIndex = zipperDot(
          p.up,
          "purple",
          logical,
          true,
          getLevel(zipper) - 1
        ) as NodesIndex<ExpressionValue>;
        Object.entries(newIndex).forEach(([id, item]) => {
          if (!index[id]) index[id] = item;
          else
            index[id] = {
              ...index[id],
              level: Math.max(index[id].level, item.level),
            };
        });
        index[p.up.id].edges.push({
          from: zipper.id,
          to: p.up.id,
          type: "purple",
          constraint: false,
        });
      });
    }
  });
  const graphPieces = Object.values(index).flatMap((x) => [
    expressionToDot(x.zipper, x.type),
    edgesToDot(x.edges),
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
