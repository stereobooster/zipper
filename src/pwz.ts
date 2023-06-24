import { List, arrayToList, cons, forEach, unwind } from "./List";

export type ID = number;
export type Level = number;
export type ExpressionType = "Tok" | "Seq" | "Alt" | "SeqC" | "AltC";

// Token requires non-empy value and empty children
// Top expression has to have non-empy value
export type Expression = {
  expressionType: ExpressionType;
  // S -> a | b
  // For token value would be the token itself i.e. a, b
  // For others value would be the symbol i.e. S
  value: string;
  children: List<Expression>;
  // for vizualization
  id: ID;
  // Level can be removed, because it can be calculated during traversal
  level: Level;
  originalId?: ID;
};

export type NarryExpression = [string, ExpressionType, Array<NarryExpression>];

export const expressionNode = ({
  originalId,
  id,
  ...props
}: Omit<Expression, "id"> & { id?: ID }): Expression => ({
  ...props,
  originalId: originalId !== undefined ? originalId : id,
  id: Math.random(),
});

export const narryTreeToExpression = (
  narryTree: NarryExpression,
  level = 1
): Expression =>
  expressionNode({
    value: narryTree[0],
    expressionType: narryTree[1],
    children: arrayToList(
      narryTree[2].map((t) => narryTreeToExpression(t, level + 1))
    ),
    level,
  });

// Vizualization part ---------------------------------------------------------

const listColor = "#8b0000";
const zipperColor = "#ff69b4";
const leftColor = "#0000cd";
const rightColor = "#006400";
const grayColor = "#708090";

type Edge = {
  from: ID;
  to: ID;
  type?: "zipper" | "green" | "blue" | "gray" | "invisible";
  // https://graphviz.org/docs/attrs/dir/
  direction?: "forward" | "backward";
  // https://graphviz.org/docs/attrs/constraint/
  constraint?: boolean;
};

type Node = Omit<Expression, "children"> & {
  type?: "green" | "blue" | "empty" | "focus" | "gray";
  zipper?: boolean;
};

type Display = {
  logicalEdges: Edge[];
  memoryEdges: Edge[];
  ranks: Record<ID, Level>;
  nodes: Record<ID, Node>;
};

const setRank = (display: Display, id: ID, level: Level) => {
  display.ranks[id] = level;
};

const addNode = (display: Display, node: Node) => {
  display.nodes[node.id] = node;
  if (node.level <= 0) return;
  setRank(display, node.id, node.level);
};

const addEdge = (
  display: Display,
  logical: boolean | number,
  memory: boolean | number,
  edge: Edge
) => {
  if (logical) display.logicalEdges.push(edge);
  if (memory) display.memoryEdges.push(edge);
};

const traverseExpression = (
  tree: Expression,
  display: Display = {
    logicalEdges: [],
    memoryEdges: [],
    ranks: {},
    nodes: {},
  },
  showOriginal?: boolean,
  type?: "green" | "blue",
  level?: number
) => {
  if (!tree) return display;
  const parent = tree;
  // loop detection
  if (display.nodes[parent.id]) return display;

  const { children, originalId, ...node } = parent;
  addNode(display, {
    ...node,
    originalId,
    type,
    level: level === undefined ? node.level : level,
  });
  if (showOriginal && originalId) {
    addNode(display, {
      ...node,
      id: originalId,
      type: "gray",
      level: level === undefined ? node.level : level,
    });
  }

  let prev = parent;
  forEach(tree.children, (t) => {
    if (!t) return;
    addEdge(display, 1, 0, {
      from: parent.id,
      to: t.id,
      type: prev.originalId !== undefined ? type : undefined,
    });
    if (showOriginal && parent.originalId) {
      addEdge(display, 1, 0, {
        from: parent.originalId,
        to: t.originalId || t.id,
        type: prev.originalId !== undefined ? "gray" : undefined,
        constraint: t.originalId !== undefined,
      });
    }
    if (parent.id !== prev.id) {
      addEdge(display, 1, 0, {
        from: prev.id,
        to: t.id,
        type: "invisible",
      });
    }
    addEdge(display, 0, 1, {
      from: prev.id,
      to: t.id,
      type: prev.originalId !== undefined ? type : undefined,
    });
    if (showOriginal && prev.originalId) {
      addEdge(display, 0, 1, {
        from: prev.originalId,
        to: t.originalId || t.id,
        type: "gray",
        constraint: t.originalId !== undefined,
      });
    }
    prev = t;
    traverseExpression(
      t,
      display,
      showOriginal,
      type,
      level === undefined ? undefined : level + 1
    );
  });
  return display;
};

const edgeToDot = ({ from, to, type, direction, constraint }: Edge) => {
  const dir = direction === "backward" ? "dir=back" : "";
  let color = listColor;
  let borderWidth = 1;
  let arrow = "";
  if (type === "zipper") {
    borderWidth = 12;
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
  { value, type, originalId, zipper, expressionType }: Node
) => {
  // https://graphviz.org/doc/info/shapes.html
  let shape = "circle";
  if (expressionType === "Tok") {
    shape = "square";
  } else if (expressionType === "Alt" || expressionType === "AltC") {
    shape = "diamond";
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
  } else if (type === "green" && originalId !== undefined) {
    fillColor = rightColor;
    borderColor = rightColor;
  } else if (type === "blue" && originalId !== undefined) {
    fillColor = leftColor;
    borderColor = leftColor;
  } else if (type === "gray") {
    fillColor = grayColor;
    borderColor = grayColor;
  }

  if (zipper) {
    borderColor = zipperColor;
  }
  // ${value === "" ? "width=0.05 height=0.05" : ""}
  return `${id} [penwidth=4 style="filled,solid" label="${value}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}]`;
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

const nodesDot = (nodes: Record<ID, Node>) =>
  Object.entries(nodes)
    .map(([id, node]) => nodeToDot(id, node))
    .join("\n");

const edgesDot = (edges: Edge[]) => edges.map(edgeToDot).join("\n");

const toDot = (
  { logicalEdges, memoryEdges, ranks, nodes }: Display,
  logical = false
) => {
  const x = `
    ${levelsDot(ranks)}
    ${ranksDot(ranks)}
    ${nodesDot(nodes)}
    ${edgesDot(logical ? logicalEdges : memoryEdges)}
  `.trim();
  // console.log(x);
  return x;
};

export const expressionToDot = ({
  logical,
  tree,
}: {
  logical: boolean;
  tree: Expression;
}) =>
  `digraph {
    node [fontcolor=white fixedsize=true width=0.3 height=0.3]
    edge [color="${listColor}"]
    ${toDot(traverseExpression(tree), logical)}
  }`.trim();

// Zipper ---------------------------------------------------------------------

export type ExpressionZipperPath = List<
  Omit<Expression, "children"> & {
    left: List<Expression>;
    right: List<Expression>;
  }
>;

export type ExpressionZipper = {
  left: List<Expression>;
  right: List<Expression>;
  up: ExpressionZipperPath;
  focus: Expression;
};

export const expressionToZipper = (tree: Expression): ExpressionZipper => {
  return {
    left: null,
    right: null,
    up: null,
    focus: tree,
  };
};

export const right = (zipper: ExpressionZipper): ExpressionZipper => {
  // other way would be to throw an Error
  if (
    zipper.focus === null ||
    zipper.right === null ||
    zipper.right.value === null
  )
    return zipper;
  return {
    left: cons(zipper.focus, zipper.left),
    right: zipper.right.next,
    up: zipper.up,
    focus: expressionNode({ ...zipper.right.value, level: zipper.focus.level }),
  };
};

export const left = (zipper: ExpressionZipper): ExpressionZipper => {
  // other way would be to throw an Error
  if (
    zipper.focus === null ||
    zipper.left === null ||
    zipper.left.value === null
  )
    return zipper;
  return {
    left: zipper.left.next,
    right: cons(zipper.focus, zipper.right),
    up: zipper.up,
    focus: expressionNode({ ...zipper.left.value, level: zipper.focus.level }),
  };
};

export const down = (zipper: ExpressionZipper): ExpressionZipper => {
  // other way would be to throw an Error
  if (zipper.focus === null || zipper.focus.children === null) return zipper;
  const children = zipper.focus.children;
  if (children.value === null) return zipper;
  return {
    left: null,
    right: children.next,
    up: cons(
      {
        left: zipper.left,
        right: zipper.right,
        value: zipper.focus.value,
        expressionType: zipper.focus.expressionType,
        // for vizualization
        id: Math.random(),
        level: zipper.focus.level,
        originalId: zipper.focus.originalId || zipper.focus.id,
      },
      zipper.up
    ),
    focus: expressionNode({ ...children.value, level: zipper.focus.level + 1 }),
  };
};

export const up = (zipper: ExpressionZipper): ExpressionZipper => {
  // other way would be to throw an Error
  if (zipper.up === null) return zipper;
  return {
    left: zipper.up.value.left,
    right: zipper.up.value.right,
    up: zipper.up.next,
    focus: expressionNode({
      value: zipper.up.value.value,
      expressionType: zipper.up.value.expressionType,
      // NOTE: this is not a contant time operation
      children: unwind(zipper.left, zipper.focus, zipper.right),
      // for vizualization
      level: zipper.up.value.level,
      originalId: zipper.up.value.originalId,
    }),
  };
};

export const replace = (
  zipper: ExpressionZipper,
  focus: Expression
): ExpressionZipper => ({
  ...zipper,
  focus,
});

// Derivative ---------------------------------------------------------------------
// https://dl.acm.org/doi/pdf/10.1145/3408990

// empty string
const empty = {
  expressionType: "Seq",
  // value: "",
  children: null,
} as const;

// empty language
// const nil = {
//   expressionType: "Alt",
//   value: "",
//   children: null,
// } as const;

export type DeriveDirection = "down" | "up" | "none";

export function deriveStep(
  token: string,
  zipper: ExpressionZipper,
  direction: DeriveDirection
): [ExpressionZipper | null, DeriveDirection] {
  if (direction === "down") return deriveDown(token, zipper);
  else if (direction === "up") return deriveUp(zipper);
  else return [zipper, "none"];
}

function deriveDown(
  token: string,
  zipper: ExpressionZipper
): [ExpressionZipper | null, DeriveDirection] {
  switch (zipper.focus.expressionType) {
    case "Tok":
      // | Tok (t') -> if t = t' then Some (Seq (t, []), c) else None
      if (zipper.focus.value !== token) return [null, "none"];
      return [
        replace(zipper, expressionNode({ ...zipper.focus, ...empty })),
        "none",
      ];
    case "Seq":
      // | Seq (s, []) -> d↑ (Seq (s, [])) c
      if (zipper.focus.children === null) return [zipper, "up"];
      // | Seq (s, e :: es) -> d↓ (SeqC (c, s, [], es)) e
      return [
        down(
          replace(
            zipper,
            expressionNode({ ...zipper.focus, expressionType: "SeqC" })
          )
        ),
        "down",
      ];
  }
  return [null, "none"];
}

function deriveUp(
  zipper: ExpressionZipper
): [ExpressionZipper | null, DeriveDirection] {
  // | TopC -> None
  if (zipper.up === null) return [null, "none"];
  // | SeqC (c, s, es, []) -> d↑ (Seq (s, List.rev (e :: es))) c
  if (zipper.right === null) return [up(zipper), "up"];
  // | SeqC (c, s, esL , eR :: esR ) -> d↓ (SeqC (c, s, e :: esL , esR )) eR
  return [right(zipper), "down"];
}

// Vizualization part ---------------------------------------------------------

const traverseUp = (
  zipperPath: ExpressionZipperPath,
  display: Display = {
    logicalEdges: [],
    memoryEdges: [],
    ranks: {},
    nodes: {},
  },
  showOriginal: boolean,
  focus?: Expression
) => {
  if (!zipperPath) return display;

  const zipper = zipperPath.value;
  const current = zipper as { id: ID; originalId?: ID; level: Level };
  const up = zipperPath.next?.value;

  if (up) {
    if (showOriginal && up.originalId) {
      addNode(display, {
        value: up.value,
        expressionType: up.expressionType,
        id: up.originalId,
        type: "gray",
        level: up.level,
      });
      addEdge(display, 1, zipper.left === null, {
        from: up.originalId,
        to: current.originalId || current.id,
        type: "gray",
        constraint: current.originalId !== undefined,
      });
    }

    addEdge(display, 1, 1, {
      from: up.id,
      to: current.id,
      direction: "backward",
      type: focus ? "zipper" : "blue",
    });
    addNode(display, {
      value: up.value,
      expressionType: up.expressionType,
      id: up.id,
      type: "blue",
      originalId: up.originalId,
      zipper: focus ? true : false,
      level: up.level,
    });

    traverseUp(zipperPath.next, display, showOriginal);
  } else {
    if (focus) {
      const upId = 90;
      addEdge(display, 1, 1, {
        from: upId,
        to: focus.id,
        direction: "backward",
        type: "zipper",
      });
      addNode(display, {
        value: "",
        id: upId,
        type: "empty",
        zipper: true,
        level: 0,
      } as Node);
    } else {
      const upId = 80;
      addEdge(display, 1, 1, {
        from: upId,
        to: current.id,
        type: "invisible",
      });
      addNode(display, {
        value: "",
        id: upId,
        type: "empty",
        level: 0,
      } as Node);
    }
  }

  const left = zipper.left?.value;
  if (left) {
    let prev = current;
    forEach(zipper.left, (node) => {
      if (!node) return;

      if (showOriginal && up && up.originalId) {
        addEdge(display, 1, 0, {
          from: up.originalId,
          to: node.originalId || node.id,
          type: "gray",
          constraint: node.originalId !== undefined,
        });
        if (node.originalId && prev.originalId) {
          addEdge(display, 1, 0, {
            from: node.originalId,
            to: prev.originalId,
            type: "invisible",
          });
        }
        addEdge(display, 0, 1, {
          from: node.originalId || node.id,
          to: prev.originalId || prev.id,
          type: "gray",
          constraint: Boolean(node.originalId && prev.originalId),
        });
      }

      traverseExpression(node, display, showOriginal, "blue", current.level);
      addEdge(display, 1, 1, {
        from: node.id,
        to: prev.id,
        direction: "backward",
        type: focus && node.id === left.id ? "zipper" : "blue",
      });
      prev = node;
    });

    if (showOriginal && up && up.originalId) {
      addEdge(display, 0, 1, {
        from: up.originalId,
        to: prev.originalId || prev.id,
        type: "gray",
        constraint: prev.originalId !== undefined,
      });
    }

    if (focus) {
      display.nodes[left.id].type = "blue";
      display.nodes[left.id].zipper = true;
    }
  } else if (focus) {
    const leftId = 92;
    addEdge(display, 1, 1, {
      from: leftId,
      to: focus.id,
      type: "zipper",
      direction: "backward",
    });
    addNode(display, {
      value: "",
      id: leftId,
      type: "empty",
      zipper: true,
      level: focus.level,
    } as Node);
  }

  const right = zipper.right?.value;
  if (right) {
    let prev = current;
    forEach(zipper.right, (node) => {
      if (!node) return;

      if (showOriginal && up && up.originalId) {
        addEdge(display, 1, 0, {
          from: up.originalId,
          to: node.originalId || node.id,
          type: "gray",
          constraint: node.originalId !== undefined,
        });
        addEdge(display, 0, 1, {
          from: prev.originalId || prev.id,
          to: node.originalId || node.id,
          type: "gray",
          constraint: false,
        });
        if (node.originalId && prev.originalId) {
          addEdge(display, 1, 0, {
            from: prev.originalId,
            to: node.originalId,
            type: "invisible",
          });
        }
      }

      traverseExpression(node, display, showOriginal, "green", current.level);

      addEdge(display, 1, 1, {
        from: prev.id,
        to: node.id,
        type:
          focus && node.id === right.id
            ? "zipper"
            : node.originalId !== undefined
            ? "green"
            : undefined,
      });
      prev = node;
    });

    if (focus) {
      display.nodes[right.id].type = "green";
      display.nodes[right.id].zipper = true;
      setRank(display, right.id, zipper.level);
    }
  } else if (focus) {
    const rightId = 91;
    addEdge(display, 1, 1, {
      from: focus.id,
      to: rightId,
      type: "zipper",
    });
    addNode(display, {
      value: "",
      id: rightId,
      type: "empty",
      zipper: true,
      level: focus.level,
    } as Node);
  }

  return display;
};

const treeToHash = (
  tree: Expression,
  result: Record<ID, { value: string; expressionType: ExpressionType }> = {}
) => {
  if (!tree) return result;
  result[tree.id] = {
    value: tree.value,
    expressionType: tree.expressionType,
  };
  forEach(tree.children, (node) => treeToHash(node, result));
  return result;
};

const traverseZipper = (zipper: ExpressionZipper, tree?: Expression) => {
  const display: Display = {
    logicalEdges: [],
    memoryEdges: [],
    ranks: {},
    nodes: {},
  };
  if (!zipper.focus) return display;
  const focus = zipper.focus;
  traverseExpression(focus, display, Boolean(tree), "green", focus.level);
  display.nodes[focus.id].type = "focus";
  display.nodes[focus.id].zipper = true;
  traverseUp(
    cons(
      {
        left: zipper.left,
        right: zipper.right,
        value: focus.value,
        expressionType: focus.expressionType,
        id: focus.id,
        level: focus.level,
        originalId: focus.originalId,
      },
      zipper.up
    ),
    display,
    Boolean(tree),
    focus
  );

  if (tree) {
    Object.entries(treeToHash(tree)).forEach(
      ([id, { value, expressionType }]) => {
        if (display.nodes[id as any]) {
          display.nodes[id as any].value = value;
          display.nodes[id as any].expressionType = expressionType;
        }
      }
    );
  }
  return display;
};

export const expressionZipperToDot = ({
  logical,
  tree,
  zipper,
}: {
  logical: boolean;
  zipper: ExpressionZipper;
  tree?: Expression;
}) =>
  `digraph {
    node [fixedsize=true width=0.3 height=0.3 shape=circle fontcolor=white]
    edge [color="${listColor}"]
    ${toDot(traverseZipper(zipper, tree), logical)}
  }`.trim();
