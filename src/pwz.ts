import { List, arrayToList, cons, forEach, unwind } from "./List";
import {
  grayColor,
  leftColor,
  listColor,
  rightColor,
  zipperColor,
} from "./common";
import { Memo } from "./pwzMemo";

export type ID = number;
export type Level = number;
export type ExpressionType =
  | "Tok"
  | "Seq"
  | "Alt"
  | "SeqC"
  | "AltC"
  | "TokAny"
  | "TokExc";

export type Mem = {
  parents: ExpressionZipper[];
  result: Record<number, Expression[]>;
};

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
  originalId?: ID;
  // cache
  m?: Mem;
};

export const expressionNode = ({
  originalId,
  id,
  expressionType,
  children,
  value,
  ...props
}: Omit<Expression, "id"> & { id?: ID }): Expression => {
  if (expressionType === "Tok" && children !== null)
    throw Error("Token can't have children");
  if (expressionType === "Tok" && value === "") expressionType = "Seq";
  if (expressionType === "Seq" && children === null && value === "")
    value = "ϵ";
  if (expressionType === "Alt" && children === null && value === "")
    value = "∅";
  return {
    ...props,
    expressionType,
    children,
    value,
    originalId: originalId !== undefined ? originalId : id,
    id: Math.random(),
  };
};

// Vizualization part ---------------------------------------------------------

type Edge = {
  from: ID;
  to: ID;
  type?: "zipper" | "green" | "blue" | "gray" | "invisible";
  // https://graphviz.org/docs/attrs/dir/
  direction?: "forward" | "backward";
  // https://graphviz.org/docs/attrs/constraint/
  constraint?: boolean;
};

type Trie = Record<ID, Record<ID, Edge>>;

const addToTrie = (trie: Trie, edge: Edge) => {
  if (!trie[edge.from]) trie[edge.from] = {};
  trie[edge.from][edge.to] = edge;
};

type Node = Omit<Expression, "children"> & {
  type?: "green" | "blue" | "empty" | "focus" | "gray";
  zipper?: boolean;
};

type Display = {
  logicalEdges: Trie;
  memoryEdges: Trie;
  ranks: Record<ID, Level>;
  nodes: Record<ID, Node>;
};

const setRank = (display: Display, id: ID, level: Level) => {
  display.ranks[id] = level;
};

const addNode = (display: Display, node: Node, level: number) => {
  display.nodes[node.id] = node;
  // if (node.level <= 0) return;
  setRank(display, node.id, level);
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

const traverseExpression = (
  tree: Expression,
  display: Display = {
    logicalEdges: {},
    memoryEdges: {},
    ranks: {},
    nodes: {},
  },
  showOriginal?: boolean,
  type?: "green" | "blue",
  level = 1
) => {
  if (!tree) return display;
  const parent = tree;
  // loop detection
  if (display.nodes[parent.id]) return display;

  const { children, originalId, ...node } = parent;
  addNode(
    display,
    {
      ...node,
      originalId,
      type,
    },
    level
  );
  if (showOriginal && originalId) {
    addNode(
      display,
      {
        ...node,
        id: originalId,
        type: "gray",
      },
      level
    );
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
  { value, type, originalId, zipper, expressionType }: Node
) => {
  // https://graphviz.org/doc/info/shapes.html
  let shape = "circle";

  if (expressionType === "TokAny") {
    shape = "house";
  } else if (expressionType === "TokExc") {
    shape = "invhouse";
  } else if (expressionType === "Tok") {
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

  let label = value;
  if (expressionType === "TokAny") label = "?";
  if (expressionType === "Tok" && value === "") label = "ϵ";
  if ((expressionType === "Seq" || expressionType === "SeqC") && value === "")
    label = "·";
  if ((expressionType === "Alt" || expressionType === "AltC") && value === "")
    label = "∪";

  // TODO: escape label value
  if (label === '"') label = '\\"';
  if (label === "\\") label = "\\\\";

  return `${id} [penwidth=4 style="filled,solid" label="${label}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}]`;
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

const edgesDot = (edges: Trie) =>
  Object.values(edges)
    .flatMap((toEdges) => Object.values(toEdges))
    .map(edgeToDot)
    .join("\n");

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
  console.log(x);
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
    level: number;
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
    focus: expressionNode({ ...zipper.right.value }),
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
    focus: expressionNode({ ...zipper.left.value }),
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
        level: (zipper.up?.value.level || 0) + 1,
        originalId: zipper.focus.originalId || zipper.focus.id,
        m: zipper.focus.m,
      },
      zipper.up
    ),
    focus: expressionNode({ ...children.value }),
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
      originalId: zipper.up.value.originalId,
      m: zipper.up.value.m,
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

export const mapChildren = <T>(
  zipper: ExpressionZipper,
  cb: (zipper: Expression) => T
): T[] => {
  const res: T[] = [];
  forEach(zipper.focus.children, (x) => res.push(cb(x)));
  return res;
};

export const replaceType = (
  zipper: ExpressionZipper,
  expressionType: ExpressionType
): ExpressionZipper => ({
  ...zipper,
  focus: expressionNode({ ...zipper.focus, expressionType }),
});

// Derivative ---------------------------------------------------------------------
// https://dl.acm.org/doi/pdf/10.1145/3408990

// empty string
const empty = {
  expressionType: "Seq",
  children: null,
} as const;

// empty language
// const nil = {
//   expressionType: "Alt",
//   value: "",
//   children: null,
// } as const;

export type DeriveDirection = "down" | "up" | "none" | "downPrime" | "upPrime";
const mems = new Memo<Mem>();
export type Step = [DeriveDirection, ExpressionZipper, Mem | undefined];

export function deriveStep(
  position: number,
  token: string,
  steps: Step[],
  stepNo = 0
): Step[] {
  return steps.flatMap((step, i) => {
    if (i !== stepNo) return [step];
    const [direction, zipper, m] = step;
    switch (direction) {
      case "down":
        return deriveDown(position, zipper);
      case "up":
        if (!m) console.log("undefined m");
        return deriveUp(position, zipper, m!);
      case "downPrime":
        if (!m) console.log("undefined m");
        return deriveDownPrime(token, zipper, m!);
      case "upPrime":
        return deriveUpPrime(zipper);
      case "none":
        return [step];
    }
  });
}

function deriveDownPrime(
  token: string,
  zipper: ExpressionZipper,
  m: Mem
): Step[] {
  switch (zipper.focus.expressionType) {
    case "TokAny":
      return [
        [
          "none",
          replace(
            zipper,
            expressionNode({ ...zipper.focus, ...empty, value: token })
          ),
          m,
        ],
      ];
    case "TokExc":
      if (zipper.focus.value === token) return [];
      return [
        [
          "none",
          replace(
            zipper,
            expressionNode({ ...zipper.focus, ...empty, value: token })
          ),
          m,
        ],
      ];
    case "Tok":
      // | Tok (t') -> if t = t' then [(Seq (t, []), m)] else []
      if (zipper.focus.value !== token) return [];
      return [
        [
          "none",
          replace(zipper, expressionNode({ ...zipper.focus, ...empty })),
          m,
        ],
      ];
    case "Seq":
      // | Seq (s, []) -> d↑ (Seq (s, [])) m
      if (zipper.focus.children === null) return [["up", zipper, m]];
      // | Seq (s, e :: es) -> d↓ (SeqC (m, s, [], es)) e
      return [
        [
          "down",
          down(
            replace(
              zipper,
              expressionNode({ ...zipper.focus, expressionType: "SeqC", m })
            )
          ),
          undefined,
        ],
      ];
    case "Alt":
      // | Alt (es) -> List.concat (List.map (d↓ (AltC m)) es)
      return mapChildren(zipper, (e) => {
        return [
          "down",
          down(
            replace(
              zipper,
              expressionNode({
                ...zipper.focus,
                expressionType: "AltC",
                children: cons(e, null),
                m,
              })
            )
          ),
          undefined,
        ];
      });
    default:
      console.log(`Unhandled type: ${zipper.focus.expressionType}`);
      return [];
  }
}

function deriveUpPrime(zipper: ExpressionZipper): Step[] {
  // | TopC -> []
  if (zipper.up === null) return [];
  let x: ExpressionZipper;
  switch (zipper.up.value.expressionType) {
    case "SeqC":
      // | SeqC (m, s, es, []) -> d↑ (Seq (s, List.rev (e :: es))) m
      if (zipper.right === null) {
        x = up(zipper);
        return [
          [
            "up",
            replace(
              x,
              expressionNode({
                ...x.focus,
                expressionType: "Seq",
                m: undefined,
              })
            ),
            x.focus.m,
          ],
        ];
      }
      // | SeqC (m, s, esL , eR :: esR ) -> d↓ (SeqC (m, s, e :: esL , esR )) eR
      return [["down", right(zipper), undefined]];
    case "AltC":
      // | AltC (m) -> d↑ (Alt [e]) m
      x = up(zipper);
      return [
        [
          "up",
          replace(
            x,
            expressionNode({
              ...x.focus,
              expressionType: "Alt",
              m: undefined,
            })
          ),
          x.focus.m,
        ],
      ];
    default:
      console.log(`Unhandled type: ${zipper.focus.expressionType}`);
      return [];
  }
}

function deriveDown(position: number, zipper: ExpressionZipper): Step[] {
  let m = mems.get(zipper.focus.originalId || zipper.focus.id, position);
  // match mems.get(p, e) with
  // | Some (m) ->
  if (m) {
    // m.parents <- c :: m.parents;
    if (m.parents.indexOf(zipper) === -1) m.parents.unshift(zipper);
    // List.concat (List.map (fun e -> d′↑ e c) m.result.get(p)
    return (m.result[position] || []).map((e: Expression) => [
      "upPrime",
      replace(zipper, expressionNode(e)),
      undefined,
    ]);
  }
  // | None ->
  else {
    // let m = { parents = [c]; result = ∅ } in
    m = {
      parents: [zipper],
      result: {},
    };
    // mems.put(p, e, m);
    mems.set(zipper.focus.originalId || zipper.focus.id, position, m);
    // d′↓ m e
    return [["downPrime", zipper, m]];
  }
}

function deriveUp(position: number, zipper: ExpressionZipper, m: Mem): Step[] {
  // m.result.put(p, e :: m.result.get(p));
  if (!m.result[position]) m.result[position] = [];
  m.result[position].unshift(zipper.focus);
  // List.concat (List.map (d′↑ e) m.parents)
  return m.parents.map((c: ExpressionZipper) => [
    "upPrime",
    replace(c, expressionNode(zipper.focus)),
    m,
  ]);
}

// Vizualization part ---------------------------------------------------------

const traverseUp = (
  zipperPath: ExpressionZipperPath,
  display: Display,
  showOriginal: boolean,
  focus?: Expression
) => {
  if (!zipperPath) return display;

  const zipper = zipperPath.value;
  const current = zipper as { id: ID; originalId?: ID; level: Level };
  const up = zipperPath.next?.value;

  if (up) {
    if (showOriginal && up.originalId) {
      addNode(
        display,
        {
          value: up.value,
          expressionType: up.expressionType,
          id: up.originalId,
          type: "gray",
        },
        up.level
      );
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
    addNode(
      display,
      {
        value: up.value,
        expressionType: up.expressionType,
        id: up.id,
        type: "blue",
        originalId: up.originalId,
        zipper: focus ? true : false,
      },
      up.level
    );

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
      addNode(
        display,
        {
          value: "",
          id: upId,
          type: "empty",
          zipper: true,
        } as Node,
        0
      );
    } else {
      const upId = 80;
      addEdge(display, 1, 1, {
        from: upId,
        to: current.id,
        type: "invisible",
      });
      addNode(
        display,
        {
          value: "",
          id: upId,
          type: "empty",
        } as Node,
        0
      );
    }
  }

  const left = zipper.left?.value;
  if (left) {
    let prev = current as { id: ID; originalId?: ID };
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
  }

  const right = zipper.right?.value;
  if (right) {
    let prev = current as { id: ID; originalId?: ID };
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
  }

  return display;
};

const treeToHash = (
  tree: Expression,
  result: Record<ID, { value: string; expressionType: ExpressionType }> = {}
) => {
  if (!tree) return result;
  // break loop
  if (result[tree.id]) return result;
  result[tree.id] = {
    value: tree.value,
    expressionType: tree.expressionType,
  };
  forEach(tree.children, (node) => treeToHash(node, result));
  return result;
};

const traverseZipper = (
  display: Display,
  zipper: ExpressionZipper,
  tree?: Expression
) => {
  if (!zipper.focus) return display;
  const focus = zipper.focus;
  traverseExpression(
    focus,
    display,
    Boolean(tree),
    "green",
    (zipper.up?.value.level || 0) + 1
  );
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
        level: (zipper.up?.value.level || 0) + 1,
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
  zippers,
  tree,
}: {
  logical: boolean;
  zippers: ExpressionZipper[];
  tree?: Expression;
}) => {
  const display: Display = {
    logicalEdges: {},
    memoryEdges: {},
    ranks: {},
    nodes: {},
  };
  zippers.forEach((zipper) => traverseZipper(display, zipper, tree));
  return `digraph {
    node [fixedsize=true width=0.3 height=0.3 shape=circle fontcolor=white]
    edge [color="${listColor}"]
    ${toDot(display, logical)}
  }`.trim();
};
