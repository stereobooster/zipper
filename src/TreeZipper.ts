import { List, cons, forEach, unwind } from "./List";
import { ID, Level, Tree, treeNode } from "./Tree";

export type TreeZipperPath<T, P = Tree<T>> = List<{
  left: List<P>;
  value: T;
  right: List<P>;
  // for vizualization
  id: ID;
  level: Level;
  originalId?: ID;
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
        id: Math.random(),
        level: zipper.focus.level,
        originalId: zipper.focus.originalId || zipper.focus.id,
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
      level: zipper.up.value.level,
      originalId: zipper.up.value.id,
    }),
  };
};

export const replace = <T>(zipper: TreeZipper<T>, value: T): TreeZipper<T> => {
  if (!zipper.focus) return zipper;
  return {
    left: zipper.left,
    right: zipper.right,
    up: zipper.up,
    focus: treeNode({ ...zipper.focus, value }),
  };
};

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
type Node<T> = {
  value: T;
  id: ID;
  originalId?: ID;
  level: Level;
  type?: "green" | "blue" | "empty" | "focus" | "gray";
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

  display: Display<T> = {
    logicalEdges: [],
    memoryEdges: [],
    ranks: {},
    nodes: {},
  },
  type?: "green" | "blue"
) => {
  if (!tree) return display;
  const parent = tree;

  const { children, originalId, ...node } = parent;
  display.nodes[parent.id] = { ...node, originalId, type };
  setRank(display, tree.level, parent.id);

  if (originalId) {
    display.nodes[originalId] = { ...node, id: originalId, type: "gray" };
    setRank(display, tree.level, originalId);
  }

  let prev = parent;
  forEach(tree.children, (t) => {
    if (!t) return;
    display.logicalEdges.push({
      from: parent.id,
      to: t.id,
      type: prev.originalId !== undefined ? type : undefined,
    });
    if (parent.originalId) {
      display.logicalEdges.push({
        from: parent.originalId,
        to: t.originalId || t.id,
        type: prev.originalId !== undefined ? "gray" : undefined,
        constraint: t.originalId !== undefined,
      });
    }
    if (parent.id !== prev.id) {
      display.logicalEdges.push({
        from: prev.id,
        to: t.id,
        type: "invisible",
      });
    }
    display.memoryEdges.push({
      from: prev.id,
      to: t.id,
      type: prev.originalId !== undefined ? type : undefined,
    });
    if (prev.originalId) {
      display.memoryEdges.push({
        from: prev.originalId,
        to: t.originalId || t.id,
        type: "gray",
        constraint: t.originalId !== undefined,
      });
    }
    prev = t;
    traverseTree(t, display, type);
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
  }
) => {
  if (!zipperPath) return display;

  const zipper = zipperPath.value;
  const focus = zipper as { id: ID; originalId?: ID };

  const up = zipperPath.next?.value;
  if (up) {
    if (up.originalId) {
      display.nodes[up.originalId] = {
        value: up.value,
        id: up.originalId,
        type: "gray",
        level: up.level,
      };
      setRank(display, up.level, up.originalId);
      const edge: Edge = {
        from: up.originalId,
        to: focus.originalId || focus.id,
        type: "gray",
        constraint: focus.originalId !== undefined,
      };
      display.logicalEdges.push(edge);
      if (zipper.left === null) {
        display.memoryEdges.push(edge);
      }
    }

    const edge: Edge = {
      from: up.id,
      to: focus.id,
      direction: "backward",
      type: "blue",
    };
    display.logicalEdges.push(edge);
    display.memoryEdges.push(edge);
    display.nodes[up.id] = {
      value: up.value,
      id: up.id,
      originalId: up.originalId,
      type: "blue",
      level: up.level,
    };
    setRank(display, up.level, up.id);

    traverseUp(zipperPath.next, display);
  } else {
    const upId = 80;
    const edge: Edge = {
      from: upId,
      to: focus.id,
      type: "invisible",
    };
    display.logicalEdges.push(edge);
    display.memoryEdges.push(edge);
    display.nodes[upId] = {
      value: "",
      id: upId,
      type: "empty",
      level: 0,
    } as Node<T>;
  }

  const left = zipper.left?.value;
  if (left) {
    let prev = focus;
    forEach(zipper.left, (node) => {
      if (!node) return;

      if (up && up.originalId) {
        display.logicalEdges.push({
          from: up.originalId,
          to: node.originalId || node.id,
          type: "gray",
          constraint: node.originalId !== undefined,
        });
        if (node.originalId && prev.originalId) {
          display.logicalEdges.push({
            from: node.originalId,
            to: prev.originalId,
            type: "invisible",
          });
        }
        display.memoryEdges.push({
          from: node.originalId || node.id,
          to: prev.originalId || prev.id,
          type: "gray",
          constraint: Boolean(node.originalId && prev.originalId),
        });
      }

      traverseTree(node, display, "blue");
      const edge: Edge = {
        from: node.id,
        to: prev.id,
        direction: "backward",
        type: "blue",
      };
      display.logicalEdges.push(edge);
      display.memoryEdges.push(edge);
      prev = node;
    });
    setRank(display, zipper.level, left.id);
  }

  const right = zipper.right?.value;
  if (right) {
    let prev = focus;
    forEach(zipper.right, (node) => {
      if (!node) return;

      if (up && up.originalId) {
        display.logicalEdges.push({
          from: up.originalId,
          to: node.originalId || node.id,
          type: "gray",
          constraint: node.originalId !== undefined,
        });
        display.memoryEdges.push({
          from: prev.originalId || prev.id,
          to: node.originalId || node.id,
          type: "gray",
          constraint: false,
        });
      }
      if (node.originalId && prev.originalId) {
        display.logicalEdges.push({
          from: prev.originalId,
          to: node.originalId,
          type: "invisible",
        });
      }

      traverseTree(node, display, "green");
      const edge: Edge = {
        from: prev.id,
        to: node.id,
        type: node.originalId !== undefined ? "green" : undefined,
      };
      display.logicalEdges.push(edge);
      display.memoryEdges.push(edge);
      prev = node;
    });
    setRank(display, zipper.level, right.id);
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
  if (!zipper.focus) return display;

  const focus = zipper.focus;
  traverseTree(focus, display, "green");
  display.nodes[focus.id].type = "focus";
  display.nodes[focus.id].zipper = true;

  const up = zipper.up?.value;
  if (up) {
    if (up.originalId) {
      display.nodes[up.originalId] = {
        value: up.value,
        id: up.originalId,
        type: "gray",
        level: up.level,
      };
      setRank(display, up.level, up.originalId);
      const edge: Edge = {
        from: up.originalId,
        to: focus.originalId || focus.id,
        type: "gray",
        constraint: focus.originalId !== undefined,
      };
      display.logicalEdges.push(edge);
      if (zipper.left === null) {
        display.memoryEdges.push(edge);
      }
    }

    const edge: Edge = {
      from: up.id,
      to: focus.id,
      direction: "backward",
      type: "zipper",
    };
    display.logicalEdges.push(edge);
    display.memoryEdges.push(edge);
    display.nodes[up.id] = {
      value: up.value,
      id: up.id,
      type: "blue",
      zipper: true,
      originalId: up.originalId,
      level: up.level,
    };
    setRank(display, up.level, up.id);

    traverseUp(zipper.up, display);
  } else {
    const upId = 90;
    const edge: Edge = {
      from: upId,
      to: focus.id,
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

  const left = zipper.left?.value;
  if (left) {
    let prev = focus;
    forEach(zipper.left, (node) => {
      if (!node) return;

      if (up && up.originalId) {
        display.logicalEdges.push({
          from: up.originalId,
          to: node.originalId || node.id,
          type: "gray",
          constraint: node.originalId !== undefined,
        });
        if (node.originalId && prev.originalId) {
          display.logicalEdges.push({
            from: node.originalId,
            to: prev.originalId,
            type: "invisible",
          });
        }
        display.memoryEdges.push({
          from: node.originalId || node.id,
          to: prev.originalId || prev.id,
          type: "gray",
          constraint: Boolean(node.originalId && prev.originalId),
        });
      }
      traverseTree(node, display, "blue");
      const edge: Edge = {
        from: node.id,
        to: prev.id,
        direction: "backward",
        type: node.id === left.id ? "zipper" : "blue",
      };
      display.logicalEdges.push(edge);
      display.memoryEdges.push(edge);
      prev = node;
    });

    if (up && up.originalId) {
      display.memoryEdges.push({
        from: up.originalId,
        to: prev.originalId || prev.id,
        type: "gray",
        constraint: prev.originalId !== undefined,
      });
    }
    display.nodes[left.id].type = "blue";
    display.nodes[left.id].zipper = true;
    setRank(display, zipper.focus.level, left.id);
  } else {
    const leftId = 92;
    const edge: Edge = {
      from: leftId,
      to: focus.id,
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

  const right = zipper.right?.value;
  if (right) {
    let prev = focus;
    forEach(zipper.right, (node) => {
      if (!node) return;

      if (up && up.originalId) {
        display.logicalEdges.push({
          from: up.originalId,
          to: node.originalId || node.id,
          type: "gray",
          constraint: node.originalId !== undefined,
        });
        display.memoryEdges.push({
          from: prev.originalId || prev.id,
          to: node.originalId || node.id,
          type: "gray",
          constraint: false,
        });
      }
      if (node.originalId && prev.originalId) {
        display.logicalEdges.push({
          from: prev.originalId,
          to: node.originalId,
          type: "invisible",
        });
      }

      traverseTree(node, display, "green");
      const edge: Edge = {
        from: prev.id,
        to: node.id,
        type:
          node.id === right.id
            ? "zipper"
            : node.originalId !== undefined
            ? "green"
            : undefined,
      };
      display.logicalEdges.push(edge);
      display.memoryEdges.push(edge);

      prev = node;
    });

    display.nodes[right.id].type = "green";
    display.nodes[right.id].zipper = true;
    setRank(display, zipper.focus.level, right.id);
  } else {
    const rightId = 91;
    const edge: Edge = {
      from: focus.id,
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
    .sort(([, nodea], [, nodeb]) => {
      if (nodea.type === "gray" && nodeb.type === "gray") {
        return nodea.level - nodeb.level;
      } else if (nodea.type === "gray") {
        return -1;
      } else if (nodeb.type === "gray") {
        return 1;
      } else {
        return nodea.level - nodeb.level;
      }
    })
    .map(([id, node]) => nodeToDot(id, node))
    .join("\n");

const edgesDot = (edges: Edge[]) =>
  edges
    .sort((edgea, edgeb) => {
      if (edgea.type === "gray" && edgeb.type === "gray") {
        return 0;
      } else if (edgea.type === "gray") {
        return -1;
      } else if (edgeb.type === "gray") {
        return 1;
      } else {
        return 0;
      }
    })
    .map(edgeToDot)
    .join("\n");

const toDot = <T>(
  { logicalEdges, memoryEdges, ranks, nodes }: Display<T>,
  logical = false
) => {
  const r = `
    ${levelsDot(ranks)}
    ${ranksDot(ranks)}
    ${nodesDot(nodes)}
    ${edgesDot(logical ? logicalEdges : memoryEdges)}
  `.trim();
  // console.log(r);
  return r;
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
//  - refactor traverse zipper and traverse up in one function
//  - flag to draw tree + zipper
//  - replace doesn't work for original items
//  - fix display jumps
//    - revert left before drawing
//  - refactor list vizualization to use the same viz as tree

/**
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
