import { List, cons, forEach, unwind } from "./List";
import { ID, Level, Tree, treeNode } from "./Tree";

export type TreeZipperPath<T, P = Tree<T>> = List<{
  left: List<P>;
  value: T;
  right: List<P>;
  // for vizualization
  id: ID;
  level: Level;
}>;

// https://youtu.be/HqHdgBXOOsE?t=490
export type TreeZipper<T, P = Tree<T>> = {
  left: List<P>;
  right: List<P>;
  up: TreeZipperPath<T, P>;
  focus: P;
  // alternatively
  // focus: T;
  // down: List<P>;
};

export const treeToZipper = <T>(tree: Tree<T>): TreeZipper<T> => {
  return {
    left: null,
    right: null,
    up: null,
    focus: tree,
  };
};

export const right = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.right === null || zipper.right.value === null) return zipper;
  return {
    left: cons(zipper.focus, zipper.left),
    right: zipper.right.next,
    up: zipper.up,
    focus: treeNode(zipper.right.value),
  };
};

export const left = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.left === null || zipper.left.value === null) return zipper;
  return {
    left: zipper.left.next,
    right: cons(zipper.focus, zipper.right),
    up: zipper.up,
    focus: treeNode(zipper.left.value),
  };
};

export const down = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
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
        value: zipper.focus.value,
        right: zipper.right,
        // for vizualization
        id: zipper.focus.originalId || zipper.focus.id,
        level: zipper.focus.level,
      },
      zipper.up
    ),
    focus: treeNode(children.value),
  };
};

export const up = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
  // other way would be to throw an Error
  if (zipper.up === null) return zipper;
  return {
    left: zipper.up.value.left,
    right: zipper.up.value.right,
    up: zipper.up.next,
    focus: treeNode({
      value: zipper.up.value.value,
      // NOTE: this is not a contant time operation
      children: unwind(zipper.left, zipper.focus, zipper.right),
      // for vizualization
      originalId: zipper.up.value.id,
      level: zipper.up.value.level,
    }),
  };
};

const listColor = "#8b0000";
const zipperColor = "#ff69b4";
const leftColor = "#0000cd";
const rightColor = "#006400";

type Edge = {
  from: ID;
  to: ID;
  type?: "zipper" | "green" | "blue";
  // https://graphviz.org/docs/attrs/dir/
  direction?: "forward" | "backward";
};
type Node<T> = {
  value: T;
  id: ID;
  originalId?: ID;
  level: Level;
  type?: "green" | "blue" | "empty" | "focus";
  zipper?: boolean;
};
type Display<T> = {
  logicalEdges: Edge[];
  memoryEdges: Edge[];
  ranks: Record<Level, ID[]>;
  nodes: Record<ID, Node<T>>;
};

const setRank = <T>(display: Display<T>, level: Level, id: ID) => {
  if (display.ranks[level]) {
    display.ranks[level].push(id);
  } else {
    display.ranks[level] = [id];
  }
};

const traverseTree = <T>(
  tree: Tree<T>,
  prefix = 0,
  display: Display<T> = {
    logicalEdges: [],
    memoryEdges: [],
    ranks: {},
    nodes: {},
  },
  type?: "green" | "blue"
) => {
  if (!tree) return display;

  const fromId = tree.id + prefix;
  setRank(display, tree.level, fromId);
  const { children, ...node } = tree;
  display.nodes[fromId] = { ...node, type };
  let from = fromId;
  let prev = tree;
  forEach(tree.children, (t) => {
    if (!t) return;
    const to = t.id + prefix;

    display.logicalEdges.push({
      from: fromId,
      to,
      type: prev.originalId !== undefined ? type : undefined,
    });
    display.memoryEdges.push({
      from,
      to,
      type: prev.originalId !== undefined ? type : undefined,
    });
    from = to;
    prev = t;
    traverseTree(t, prefix, display, type);
  });
  return display;
};

const traverseUp = <T>(
  zipperPath: TreeZipperPath<T>,
  display: Display<T> = {
    logicalEdges: [],
    memoryEdges: [],
    ranks: {},
    nodes: {},
  },
  prefix = 1
) => {
  if (!zipperPath) return display;

  const zipper = zipperPath.value;
  const focusId = zipper.id + prefix;

  if (zipper.left && zipper.left.value) {
    const leftId = zipper.left.value.id + prefix;
    let prevId = focusId;
    forEach(zipper.left, (node) => {
      if (!node) return;
      const nodeId = node.id + prefix;
      traverseTree(node, prefix, display, "blue");
      const edge: Edge = {
        from: nodeId,
        to: prevId,
        direction: "backward",
        type: "blue",
      };
      display.logicalEdges.push(edge);
      display.memoryEdges.push(edge);
      prevId = nodeId;
    });
    setRank(display, zipper.level, leftId);
  }

  if (zipper.right && zipper.right.value) {
    const rightId = zipper.right.value.id + prefix;
    let prevId = focusId;
    forEach(zipper.right, (node) => {
      if (!node) return;
      const nodeId = node.id + prefix;
      traverseTree(node, prefix, display, "green");
      const edge: Edge = {
        from: prevId,
        to: nodeId,
        type: node.originalId !== undefined ? "green" : undefined,
      };
      display.logicalEdges.push(edge);
      display.memoryEdges.push(edge);
      prevId = nodeId;
    });
    setRank(display, zipper.level, rightId);
  }

  const up = zipperPath.next?.value;
  if (up) {
    const upId = up.id + prefix;
    const edge: Edge = {
      from: upId,
      to: focusId,
      direction: "backward",
      type: "blue",
    };
    display.logicalEdges.push(edge);
    display.memoryEdges.push(edge);
    display.nodes[upId] = {
      value: up.value,
      id: upId,
      originalId: upId,
      type: "blue",
      level: up.level,
    };
    setRank(display, up.level, upId);
    traverseUp(zipperPath.next, display, prefix);
  }

  return display;
};

const traverseZipper = <T>(
  zipper: TreeZipper<T>,
  display: Display<T> = {
    logicalEdges: [],
    memoryEdges: [],
    ranks: {},
    nodes: {},
  }
) => {
  const prefix = 1;
  if (!zipper.focus) return display;
  const focusId = zipper.focus.id + prefix;

  traverseTree(zipper.focus, prefix, display, "green");
  display.nodes[focusId].type = "focus";
  display.nodes[focusId].zipper = true;

  if (zipper.left && zipper.left.value) {
    const leftId = zipper.left.value.id + prefix;
    let prevId = focusId;
    forEach(zipper.left, (node) => {
      if (!node) return;
      const nodeId = node.id + prefix;
      traverseTree(node, prefix, display, "blue");
      const edge: Edge = {
        from: nodeId,
        to: prevId,
        direction: "backward",
        type: nodeId === leftId ? "zipper" : "blue",
      };
      display.logicalEdges.push(edge);
      display.memoryEdges.push(edge);
      prevId = nodeId;
    });
    display.nodes[leftId].type = "blue";
    display.nodes[leftId].zipper = true;
    setRank(display, zipper.focus.level, leftId);
  } else {
    const leftId = 92;
    const edge: Edge = {
      from: leftId,
      to: focusId,
      type: "zipper",
      direction: "backward",
    };
    display.logicalEdges.push(edge);
    display.memoryEdges.push(edge);
    display.nodes[leftId] = {
      value: "",
      id: leftId,
      type: "empty",
      zipper: true,
      level: zipper.focus.level,
    } as Node<T>;
    setRank(display, zipper.focus.level, leftId);
  }

  if (zipper.right && zipper.right.value) {
    const rightId = zipper.right.value.id + prefix;
    let prevId = focusId;
    forEach(zipper.right, (node) => {
      if (!node) return;
      const nodeId = node.id + prefix;
      traverseTree(node, prefix, display, "green");
      const edge: Edge = {
        from: prevId,
        to: nodeId,
        type:
          nodeId === rightId
            ? "zipper"
            : node.originalId !== undefined
            ? "green"
            : undefined,
      };
      display.logicalEdges.push(edge);
      display.memoryEdges.push(edge);
      prevId = nodeId;
    });

    display.nodes[rightId].type = "green";
    display.nodes[rightId].zipper = true;
    setRank(display, zipper.focus.level, rightId);
  } else {
    const rightId = 91;
    const edge: Edge = {
      from: focusId,
      to: rightId,
      type: "zipper",
    };
    display.logicalEdges.push(edge);
    display.memoryEdges.push(edge);
    display.nodes[rightId] = {
      value: "",
      id: rightId,
      type: "empty",
      zipper: true,
      level: zipper.focus.level,
    } as Node<T>;
    setRank(display, zipper.focus.level, rightId);
  }

  traverseUp(zipper.up, display, prefix);

  if (zipper.up) {
    const upId = zipper.up.value.id + prefix;
    const edge: Edge = {
      from: upId,
      to: focusId,
      direction: "backward",
      type: "zipper",
    };
    display.logicalEdges.push(edge);
    display.memoryEdges.push(edge);
    display.nodes[upId] = {
      value: zipper.up.value.value,
      id: upId,
      type: "blue",
      zipper: true,
      originalId: upId,
      level: zipper.up.value.level,
    };
    setRank(display, zipper.up.value.level, upId);
  } else {
    const upId = 90;
    const edge: Edge = {
      from: upId,
      to: focusId,
      direction: "backward",
      type: "zipper",
    };
    display.logicalEdges.push(edge);
    display.memoryEdges.push(edge);
    display.nodes[upId] = {
      value: "",
      id: upId,
      type: "empty",
      zipper: true,
      level: 0,
    } as Node<T>;
  }

  return display;
};

const edgeToDot = ({ from, to, type, direction }: Edge) => {
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
  }
  return `${from} -> ${to} [penwidth=${borderWidth} ${arrow} ${dir} color="${color}"]`;
};

const nodeToDot = <T>(
  id: ID | string,
  { value, type, originalId, zipper }: Node<T>
) => {
  const style = "filled,solid";
  const borderWidth = 4;
  let borderColor = listColor;
  let fillColor = listColor;
  let fontcolor = "white";

  if (type === "empty") {
    fillColor = "white";
  } else if (type === "focus") {
    fillColor = "white";
    fontcolor = "black";
  } else if (type === "green" && originalId !== undefined) {
    fillColor = rightColor;
    borderColor = rightColor;
  } else if (type === "blue" && originalId !== undefined) {
    fillColor = leftColor;
    borderColor = leftColor;
  }

  if (zipper) {
    borderColor = zipperColor;
  }

  return `${id} [penwidth=${borderWidth} label="${value}" color="${borderColor}" fillcolor="${fillColor}" style="${style}" fontcolor="${fontcolor}"]`;
};

const levelsDot = (ranks: Record<Level, ID[]>) => `{
  node [style=invis];
  edge [style=invis];
  ${Object.keys(ranks).join(" -> ")}
}`;

const ranksDot = (ranks: Record<Level, ID[]>) =>
  Object.entries(ranks)
    .map(([k, v]) => `{ rank = same ; ${k} ; ${v.join(" ; ")} }`)
    .join("\n");

const nodesDot = <T>(nodes: Record<ID, Node<T>>) =>
  Object.entries(nodes)
    .sort(([, nodea], [, nodeb]) => nodea.level - nodeb.level)
    .map(([id, node]) => nodeToDot(id, node))
    .join("\n");

const toDot = <T>(
  { logicalEdges, memoryEdges, ranks, nodes }: Display<T>,
  logical = false
) => {
  const edges = logical ? logicalEdges : memoryEdges;
  return `
    ${levelsDot(ranks)}
    ${ranksDot(ranks)}
    ${nodesDot(nodes)}
    ${edges.map(edgeToDot).join("\n")}
  `.trim();
};

export const treeToDot = <T>({
  logical,
  tree,
  zipper,
}: {
  logical: boolean;
  tree?: Tree<T>;
  zipper?: TreeZipper<T>;
}) =>
  `digraph {
    node [fixedsize=true width=0.3 height=0.3 shape=circle fontcolor=white]
    edge [color="${listColor}"]
    ${tree ? toDot(traverseTree(tree), logical) : ""}
    ${zipper ? toDot(traverseZipper(zipper), logical) : ""}
  }`.trim();

// TODO:
//  - draw detached nodes as grey
//  - refactor list vizualization to use the same viz as tree
//  - function to replace value in zipper
// add explantion about logical and memory

/**
 * TODO:
 * BTree(T) = 1 +  T * BTree(T) * BTree(T)
 * ContextBtree(T) = List(2 * x * BTree(T)) * BTree(T) * BTree(T)
 */

// https://en.wikipedia.org/wiki/Left-child_right-sibling_binary_tree
// aka Knuth's tree
// type LCRSTree<T> = {
//   value: T;
//   right: LCRSTree<T>; // aka sibling
//   down: LCRSTree<T>; // aka left, child
// } | null;
