// https://dl.acm.org/doi/pdf/10.1145/3408990
import { List, arrayToList, forEach } from "./List";

export type ID = number;
export type Level = number;
export type ExpressionType = "Tok" | "Seq" | "Alt";

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

// Vizualization part

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
  } else if (expressionType === "Alt") {
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

  return `${id} [penwidth=4 style="filled,solid" label="${value}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape} ${
    value === "" ? "width=0.05 height=0.05" : ""
  }]`;
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
  return `
    ${levelsDot(ranks)}
    ${ranksDot(ranks)}
    ${nodesDot(nodes)}
    ${edgesDot(logical ? logicalEdges : memoryEdges)}
  `.trim();
};

export const treeToDot = ({
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
