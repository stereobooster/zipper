import { List, cons, forEach, unwind } from "./List";
import { ID, Level, Tree, treeNode } from "./Tree";
import { grayColor, leftColor, listColor, rightColor, zipperColor } from "./colors";

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
    focus: treeNode({ ...zipper.right.value, level: zipper.focus.level }),
  };
};

export const left = <T>(zipper: TreeZipper<T>): TreeZipper<T> => {
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
    focus: treeNode({ ...zipper.left.value, level: zipper.focus.level }),
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
    focus: treeNode({ ...children.value, level: zipper.focus.level + 1 }),
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
      // NOTE: this is not a constant time operation
      children: unwind(zipper.left, zipper.focus, zipper.right),
      // for vizualization
      level: zipper.up.value.level,
      originalId: zipper.up.value.originalId,
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
  ranks: Record<ID, Level>;
  nodes: Record<ID, Node<T>>;
};

const setRank = <T>(display: Display<T>, id: ID, level: Level) => {
  display.ranks[id] = level;
};

const addNode = <T>(display: Display<T>, node: Node<T>) => {
  display.nodes[node.id] = node;
  if (node.level <= 0) return;
  setRank(display, node.id, node.level);
};

const addEdge = <T>(
  display: Display<T>,
  logical: boolean | number,
  memory: boolean | number,
  edge: Edge
) => {
  if (logical) display.logicalEdges.push(edge);
  if (memory) display.memoryEdges.push(edge);
};

const traverseTree = <T>(
  tree: Tree<T>,
  display: Display<T> = {
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
    traverseTree(
      t,
      display,
      showOriginal,
      type,
      level === undefined ? undefined : level + 1
    );
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
  showOriginal: boolean,
  focus?: Tree<T>
) => {
  if (!zipperPath) return display;

  const zipper = zipperPath.value;
  const current = zipper as { id: ID; originalId?: ID; level: Level };
  const up = zipperPath.next?.value;

  if (up) {
    if (showOriginal && up.originalId) {
      addNode(display, {
        value: up.value,
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
      } as Node<T>);
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
      } as Node<T>);
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

      traverseTree(node, display, showOriginal, "blue", current.level);
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
    } as Node<T>);
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

      traverseTree(node, display, showOriginal, "green", current.level);

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
    } as Node<T>);
  }

  return display;
};

const treeToHash = <T>(tree: Tree<T>, result: Record<ID, T> = {}) => {
  if (!tree) return result;
  result[tree.id] = tree.value;
  forEach(tree.children, (node) => treeToHash(node, result));
  return result;
};

const traverseZipper = <T>(zipper: TreeZipper<T>, tree?: Tree<T>) => {
  const display: Display<T> = {
    logicalEdges: [],
    memoryEdges: [],
    ranks: {},
    nodes: {},
  };
  if (!zipper.focus) return display;
  const focus = zipper.focus;
  traverseTree(focus, display, Boolean(tree), "green", focus.level);
  display.nodes[focus.id].type = "focus";
  display.nodes[focus.id].zipper = true;
  traverseUp(
    cons(
      {
        left: zipper.left,
        right: zipper.right,
        value: focus.value,
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
    Object.entries(treeToHash(tree)).forEach(([id, value]) => {
      if (display.nodes[id as any]) display.nodes[id as any].value = value;
    });
  }
  return display;
};

const edgeToDot = ({ from, to, type, direction, constraint }: Edge) => {
  const dir = direction === "backward" ? "dir=back" : "";
  let color = listColor;
  let borderWidth = 1;
  let arrow = "";
  if (type === "zipper") {
    // as alternative I can move nodes over edges in generated SVG and 
    // use stroke-linecap="square" and stroke-width="26"
    borderWidth = 6;
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

const nodesDot = <T>(nodes: Record<ID, Node<T>>) =>
  Object.entries(nodes)
    .map(([id, node]) => nodeToDot(id, node))
    .join("\n");

const edgesDot = (edges: Edge[]) => edges.map(edgeToDot).join("\n");

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
  return r;
};

export const treeToDot = <T>({
  logical,
  tree,
}: {
  logical: boolean;
  tree: Tree<T>;
}) =>
  `digraph {
    node [fixedsize=true width=0.3 height=0.3 shape=circle fontcolor=white]
    edge [color="${listColor}"]
    ${toDot(traverseTree(tree), logical)}
  }`.trim();

export const treeZipperToDot = <T>({
  logical,
  tree,
  zipper,
}: {
  logical: boolean;
  zipper: TreeZipper<T>;
  tree?: Tree<T>;
}) => 
  `digraph {
    node [fixedsize=true width=0.3 height=0.3 shape=circle fontcolor=white]
    edge [color="${listColor}"]
    ${toDot(traverseZipper(zipper, tree), logical)}
  }`.trim();

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
