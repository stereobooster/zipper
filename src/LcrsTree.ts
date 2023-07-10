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

// maybe go up without rewind?
export const up = <T>(zipper: LcrsZipper<T>): LcrsZipper<T> => {
  if (zipper.up === null) throw new Error("Can't move up");
  return node({
    ...zipper.up,
    down: node({ ...leftEnd(zipper), up: null }),
  });
};

// TODO: refactor replace
export const replace = <T>(zipper: LcrsZipper<T>, value: T): LcrsZipper<T> => {
  return node({
    ...zipper,
    value,
  });
};

export const insertAfter = <T>(zipper: LcrsZipper<T>, item: LcrsZipper<T>) =>
  node({
    ...zipper,
    right: node({ ...item, right: zipper.right }),
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

// export const replaceType = (
//   zipper: ExpressionZipper,
//   expressionType: ExpressionType
// ): ExpressionZipper => ({
//   ...zipper,
//   focus: expressionNode({ ...zipper.value, expressionType }),
// });

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
  type?: "zipper" | "green" | "blue" | "gray" | "invisible";
  // https://graphviz.org/docs/attrs/dir/
  direction?: "forward" | "backward";
  // https://graphviz.org/docs/attrs/constraint/
  constraint?: boolean;
};
type Node = {
  level: Level;
  id: ID;
  type?: "green" | "blue" | "empty" | "focus" | "gray";
  zipper?: boolean;
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
  }];`;
};

const nodeToDot = memoizeWeakChain(
  "",
  (
    { id, value, originalId }: LcrsZipper<unknown>,
    type: Node["type"]
  ): string => {
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
    }

    // if (zipper) {
    //   borderColor = zipperColor;
    // }

    // tmp hack
    let label: string
    // @ts-expect-error xxx
    if (value.label !== undefined) {
      // @ts-expect-error xxx
      label = value.label
    } else 
    // @ts-expect-error xxx
    if (value.value !== undefined) {
      // @ts-expect-error xxx
      label = value.value
    } else {
      label = `${value}`
    }

    // https://graphviz.org/doc/info/shapes.html
    const shape = label.length <= 1 ? "square" : "rect";

    label = label.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

    return `${id} [penwidth=4 style="filled,solid,rounded" label="${label}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}];`;
  }
);

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

  const result: Edge[] = [];
  if (zipper === null) return result;

  if (zipper.up) {
    result.push({ from: zipper.id, to: zipper.up.id, type: "blue" });
  }

  let type: Edge["type"];

  if (zipper.left) {
    type = zipper.originalId ? givenType || "blue" : undefined;
    const edge = {
      from: zipper.left.id,
      to: zipper.id,
      direction: "backward",
    } as const;
    if (logical) {
      result.push({
        ...edge,
        type: isFocus ? "zipper" : zipperTraverse ? type : "invisible",
      });
    } else {
      result.push({ ...edge, type: isFocus ? "zipper" : type });
    }
  }

  if (zipper.right) {
    type = zipper.originalId ? givenType || "green" : undefined;
    const edge = { from: zipper.id, to: zipper.right.id };
    if (logical) {
      result.push({
        ...edge,
        type: isFocus ? "zipper" : zipperTraverse ? type : "invisible",
      });
    } else {
      result.push({
        ...edge,
        type: isFocus ? "zipper" : type,
      });
    }
  }

  if (zipper.down) {
    type = zipper.originalId ? givenType || "green" : undefined;
    if (logical) {
      forEach("right", zipper.down, (to) => {
        result.push({ from: zipper.id, to: to.id, type });
      });
    } else {
      result.push({
        from: zipper.id,
        to: zipper.down.id,
        type,
      });
    }
  }

  return result;
};

const edgesToDot = memoizeWeakChain(
  "",
  (
    zipper: LcrsZipperPath<unknown>,
    givenType: Edge["type"],
    logical = false,
    zipperTraverse = false
  ) => {
    return getEdges(
      zipper,
      givenType,
      logical as boolean,
      zipperTraverse as boolean
    )
      .map(edgeToDot)
      .join("\n");
  }
);

// maybe replace `type` with `direction`?
// Can we memoize zipper segment if it doesn't contain loop?
const zipperDot = memoizeWeakChain(
  [[], {}] as [string[], Record<ID, Level>],
  (
    zipper: LcrsZipperPath<unknown>,
    type: Node["type"],
    logical: boolean,
    zipperTraverse = true,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    level: number = -1,
    memo: Record<ID, Level> = {}
  ): [string[], Record<ID, Level>] => {
    if (!zipper) return [[], {}];
    level = level === -1 ? getLevel(zipper) : level;
    if (memo[zipper.id] !== undefined) {
      // how to set different level here?
      // memo[zipper.id] = level;
      return [[], {}];
    }
    memo[zipper.id] = level;

    const str = `${nodeToDot(zipper, type)}
      ${edgesToDot(
        zipper,
        // there is a bug in left edge from focus
        type === "focus" ? "green" : (type as any),
        logical,
        zipperTraverse as boolean
      )}`;

    const up = zipperDot(
      zipper.up,
      type === "focus" ? "blue" : type,
      logical,
      zipperTraverse,
      level - 1
    );
    const left = zipperDot(
      zipper.left,
      type === "focus" ? "blue" : type,
      logical,
      zipperTraverse,
      level
    );
    //   type === "blue"
    //     ? zipperDot(zipper.right, type, logical, zipperTraverse, level)
    // @ts-expect-error need to add type
    const right = zipperDot.original(
      zipper.right,
      type === "focus" ? "green" : type,
      logical,
      zipperTraverse,
      level,
      memo
    );
    // type === "blue"
    //   ? zipperDot(zipper.down, type, logical, false, level + 1)
    // @ts-expect-error need to add type
    const down = zipperDot.original(
      zipper.down,
      type === "focus" ? "green" : type,
      logical,
      false,
      level + 1,
      memo
    );
    return [
      [...up[0], ...left[0], str, ...right[0], ...down[0]],
      { ...up[1], ...left[1], ...memo, ...right[1], ...down[1] },
    ];
  }
);

export const lcrsZipperToDot = <T>({
  zipper,
  logical,
}: {
  zipper: LcrsZipper<T>;
  logical: boolean;
}) => {
  const [tmp, ranks] = zipperDot(zipper, "focus", logical, true);
  return `digraph {
    ${levelsDot(ranks)}
    node [fontcolor=white fixedsize=true height=0.3]
    edge [color="${listColor}"]
    ${ranksDot(ranks)}
    ${tmp.join("\n")}
  }`;
};
