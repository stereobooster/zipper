import { List, cons, forEach, unwind } from "./List";
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
  | "Rep"
  | "RepC"
  | "Lex"
  | "LexC"
  | "Ign"
  | "IgnC";

export type Expression = {
  expressionType: ExpressionType;
  // S -> a | b
  // For token label would be the token itself i.e. a, b
  // For others label would be the symbol i.e. S
  label: string;
  children: List<Expression>;
  // for vizualization
  id: ID;
  originalId?: ID;
  // cache
  m?: Mem;
  start?: number;
  end?: number;
  value?: string;
};

export const expressionNode = ({
  originalId,
  id,
  expressionType,
  children,
  label,
  value,
  ...props
}: Omit<Expression, "id"> & { id?: ID }): Expression => {
  if (expressionType === "Tok" && children !== null)
    throw Error("Token can't have children");
  if (expressionType === "Tok" && label === "") expressionType = "Seq";
  if (expressionType === "Seq" && children === null && label === "") value = "";
  return {
    ...props,
    expressionType,
    children,
    label,
    originalId: originalId !== undefined ? originalId : id,
    id: Math.random(),
    value,
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
  { label, type, originalId, zipper, expressionType, value }: Node
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

  const short = true;
  let rounded = true; // maybe: terminals rounded, non-terminals squared?

  if (value !== undefined) {
    if (value === "") {
      label = "ϵ";
      rounded = false;
    } else {
      label = value;
    }
  } else {
    if (
      (expressionType === "Seq" || expressionType === "SeqC") &&
      label === ""
    ) {
      label = short ? "∙" : "Seq";
      rounded = false;
    }
    if (
      (expressionType === "Alt" || expressionType === "AltC") &&
      label === ""
    ) {
      label = short ? "∪" : "Alt";
      rounded = false;
    }
    // Extension
    if (expressionType === "Rep" || expressionType === "RepC") {
      label = short ? "∗" : "Rep";
      rounded = false;
    }
  }

  // https://graphviz.org/doc/info/shapes.html
  const shape = label.length <= 1 ? "square" : "rect";

  label = label.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

  return `${id} [penwidth=4 style="filled,solid${
    rounded ? ",rounded" : ""
  }" label="${label}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}]`;
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
    level: number;
  }
>;

export type ExpressionZipper = {
  left: List<Expression>;
  right: List<Expression>;
  up: ExpressionZipperPath;
  focus: Expression;
};

export type Mem = {
  parents: ExpressionZipper[];
  result: Record<number, Expression[]>;
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
    throw new Error("can't go right");
  return {
    left: cons(zipper.focus, zipper.left),
    right: zipper.right.next,
    up: zipper.up,
    focus: zipper.right.value,
  };
};

export const left = (zipper: ExpressionZipper): ExpressionZipper => {
  // other way would be to throw an Error
  if (
    zipper.focus === null ||
    zipper.left === null ||
    zipper.left.value === null
  )
    throw new Error("can't go left");
  return {
    left: zipper.left.next,
    right: cons(zipper.focus, zipper.right),
    up: zipper.up,
    focus: zipper.left.value,
  };
};

export const down = (zipper: ExpressionZipper): ExpressionZipper => {
  // other way would be to throw an Error
  if (zipper.focus === null || zipper.focus.children === null)
    throw new Error("can't go down");
  const children = zipper.focus.children;
  if (children.value === null) throw new Error("can't go down");
  return {
    left: null,
    right: children.next,
    up: cons(
      {
        left: zipper.left,
        right: zipper.right,
        label: zipper.focus.label,
        expressionType: zipper.focus.expressionType,
        // for vizualization
        id: Math.random(),
        level: (zipper.up?.value.level || 0) + 1,
        originalId: zipper.focus.originalId || zipper.focus.id,
        m: zipper.focus.m,
        start: zipper.focus.start,
        end: zipper.focus.end,
        value: zipper.focus.value,
      },
      zipper.up
    ),
    focus: children.value,
  };
};

export const up = (zipper: ExpressionZipper): ExpressionZipper => {
  // other way would be to throw an Error
  if (zipper.up === null) throw new Error("can't go up");
  return {
    left: zipper.up.value.left,
    right: zipper.up.value.right,
    up: zipper.up.next,
    focus: expressionNode({
      label: zipper.up.value.label,
      expressionType: zipper.up.value.expressionType,
      // NOTE: this is not a constant time operation
      children: unwind(zipper.left, zipper.focus, zipper.right),
      // for vizualization
      id: zipper.up.value.id,
      originalId: zipper.up.value.originalId,
      m: zipper.up.value.m,
      start: zipper.up.value.start,
      end: zipper.up.value.end,
      value: zipper.up.value.value,
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

export const insertAfter = (
  zipper: ExpressionZipper,
  item: Expression
): ExpressionZipper => ({
  ...zipper,
  right: cons(item, zipper.right),
});

export const deleteBefore = (zipper: ExpressionZipper): ExpressionZipper => ({
  ...zipper,
  left: zipper.left?.next || null,
});

export const deleteAfter = (zipper: ExpressionZipper): ExpressionZipper => ({
  ...zipper,
  right: zipper.right?.next || null,
});

export const replaceType = (
  zipper: ExpressionZipper,
  expressionType: ExpressionType
): ExpressionZipper => ({
  ...zipper,
  focus: expressionNode({ ...zipper.focus, expressionType }),
});

export const chain = (
  zipper: ExpressionZipper,
  ...rest: Array<(x: ExpressionZipper) => ExpressionZipper>
) => {
  let result = zipper;
  for (const cb of rest) result = cb(result);
  return result;
};

export const mapToArray = <P, T>(list: List<P>, cb: (item: P) => T): T[] => {
  const res: T[] = [];
  forEach(list, (x) => res.push(cb(x)));
  return res;
};

// Derivative ---------------------------------------------------------------------
// https://dl.acm.org/doi/pdf/10.1145/3408990

// Extension: support for character classes
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes
const match = (label: string, token: string): boolean => {
  if (token === "") return label === "";
  // escapes
  if (label[0] === "\\") {
    // match any token. PCRE: .
    if (label[1] === ".") return true;
    // match `^` token:  PCRE: \^
    if (label[1] === "^") return token === "^";
    // match `\` token:  PCRE: \\
    if (label[1] === undefined) return token === "\\";
  }
  let not = false;
  // negation. PCRE: [^a]
  if (label[0] === "^") {
    label = label.slice(1);
    not = true;
  }
  let result;
  // character range. PCRE: [a-b]
  if (label.length === 3 && label[1] === "-") {
    result =
      label.charCodeAt(0) <= token.charCodeAt(0) &&
      label.charCodeAt(2) >= token.charCodeAt(0);
  }
  // character set. PCRE: [abc]
  else {
    result = label.includes(token);
  }
  return not ? !result : result;
};
// empty string
const empty = {
  expressionType: "Seq",
  children: null,
} as const;

export type DeriveDirection = "down" | "up" | "none" | "downPrime" | "upPrime";
const mems = new Memo<Mem>();
export type Step = [DeriveDirection, ExpressionZipper, Mem | undefined];

// primitive implementation, but good enough for prototype
const memoInput: string[] = [];

export function parse(str: string, tree: Expression) {
  const [steps] = deriveFinalSteps(str, tree);
  return steps.map(([, z]) => z.focus);
}

export function deriveFinalSteps(str: string, tree: Expression) {
  mems.reset();
  memoInput.length = 0;
  let steps: Step[] = [["down", expressionToZipper(tree), undefined]];
  let position = 0;
  let step = 0;
  do {
    const token = str[position] || "";
    const [newSteps, newPosition, newStep] = processSteps(
      token,
      position === str.length,
      position,
      steps
    );
    position = newPosition;
    steps = newSteps;
    step = newStep;
    if (steps.length === 0) break;
  } while (position <= str.length);

  mems.reset();
  memoInput.length = 0;
  return [steps, position, step] as const;
}

export function processSteps(
  token: string,
  end: boolean,
  position: number,
  steps: Step[]
) {
  memoInput[position] = token;

  let stepNo = steps.findIndex(([d]) => d !== "none");
  if (stepNo === -1) {
    stepNo = 0;
    position = position + 1;
    if (!end) steps = steps.map(([, z, m]) => ["up", z, m]);
  }

  steps = steps.flatMap((step, i) =>
    i === stepNo ? deriveStep(position, token, step) : [step]
  );

  if (end)
    steps = steps.map(([d, z, m]) =>
      d === "up" && z.up === null ? ["none", z, m] : [d, z, m]
    );

  return [steps, position, stepNo] as const;
}

function deriveStep(position: number, token: string, step: Step): Step[] {
  const [direction, zipper, m] = step;
  switch (direction) {
    case "down":
      return deriveDown(position, zipper);
    case "up":
      if (!m) console.log("undefined m");
      return deriveUp(position, zipper, m!);
    case "downPrime":
      if (!m) console.log("undefined m");
      return deriveDownPrime(position, token, zipper, m!);
    case "upPrime":
      return deriveUpPrime(zipper);
    case "none":
      return [step];
  }
}

function deriveDownPrime(
  position: number,
  token: string,
  zipper: ExpressionZipper,
  m: Mem
): Step[] {
  switch (zipper.focus.expressionType) {
    case "Tok":
      // | Tok (t') -> if t = t' then [(Seq (t, []), m)] else []
      if (!match(zipper.focus.label, token)) return [];
      return [
        [
          "none",
          replace(
            zipper,
            expressionNode({
              ...zipper.focus,
              ...empty,
              value: token,
              start: position,
              end: position + 1,
            })
          ),
          m,
        ],
      ];
    case "Seq":
      // | Seq (s, []) -> d↑ (Seq (s, [])) m
      if (zipper.focus.children === null)
        return [
          [
            "up",
            replace(
              zipper,
              expressionNode({
                ...zipper.focus,
                start: position,
                end: position,
                value: "",
              })
            ),
            m,
          ],
        ];
      // | Seq (s, e :: es) -> d↓ (SeqC (m, s, [], es)) e
      return [
        [
          "down",
          down(
            replace(
              zipper,
              expressionNode({
                ...zipper.focus,
                expressionType: "SeqC",
                m,
                start: position,
              })
            )
          ),
          undefined,
        ],
      ];
    case "Alt": {
      // not sure about that
      // return mapToArray(zipper.focus.children, (e) => {
      //   return [
      //     "down",
      //     down(
      //       replace(
      //         zipper,
      //         expressionNode({
      //           ...zipper.focus,
      //           expressionType: "AltC",
      //           children: cons(e, null),
      //           m,
      //         })
      //       )
      //     ),
      //     undefined,
      //   ];
      // )
      // | Alt (es) -> List.concat (List.map (d↓ (AltC m)) es)
      const x = down(
        replace(
          zipper,
          expressionNode({
            ...zipper.focus,
            expressionType: "AltC",
            children: cons({} as any, null),
            m,
            start: position,
          })
        )
      );
      return mapToArray(zipper.focus.children, (e) => {
        return ["down", replace(x, { ...e, start: position }), undefined];
      });
    }
    // Extension
    case "Rep": {
      let x = down(
        replace(
          zipper,
          expressionNode({
            ...zipper.focus,
            expressionType: "RepC",
            m,
            start: position,
          })
        )
      );
      x = insertAfter(x, expressionNode(x.focus));
      return [
        ["down", x, undefined],
        [
          "up",
          replace(
            zipper,
            expressionNode({
              ...zipper.focus,
              ...empty,
              start: position,
              end: position,
              value: "",
            })
          ),
          m,
        ],
      ];
    }
    case "Lex":
      return [
        [
          "down",
          down(
            replace(
              zipper,
              expressionNode({
                ...zipper.focus,
                expressionType: "LexC",
                m,
                start: position,
              })
            )
          ),
          undefined,
        ],
      ];
    case "Ign":
      return [
        [
          "down",
          down(
            replace(
              zipper,
              expressionNode({
                ...zipper.focus,
                expressionType: "IgnC",
                m,
                start: position,
              })
            )
          ),
          undefined,
        ],
      ];
    default:
      throw new Error(`Unhandled type: ${zipper.focus.expressionType}`);
  }
}

function deriveUpPrime(zipper: ExpressionZipper): Step[] {
  // | TopC -> []
  if (zipper.up === null) return [];
  switch (zipper.up.value.expressionType) {
    case "SeqC": {
      const focusEmpty =
        zipper.focus.start === zipper.focus.end ||
        (zipper.focus.expressionType === "Seq" &&
          zipper.focus.children === null &&
          zipper.focus.value === "");
      let x = up(zipper);
      // | SeqC (m, s, es, []) -> d↑ (Seq (s, List.rev (e :: es))) m
      if (zipper.right === null) {
        let children: List<Expression>;
        // horizontal compaction
        if (focusEmpty) {
          if (zipper.left === null) {
            children = null;
          } else {
            x = up(deleteAfter(left(zipper)));
            children = x.focus.children;
          }
        } else {
          children = x.focus.children;
        }
        // vertical compaction
        if (children?.next === null && x.focus.label === "") {
          return [["up", replace(x, children.value), x.focus.m]];
        }
        return [
          [
            "up",
            replace(
              x,
              expressionNode({
                ...x.focus,
                expressionType: "Seq",
                children: children,
                m: undefined,
                end: zipper.focus.end,
              })
            ),
            x.focus.m,
          ],
        ];
      }
      // | SeqC (m, s, esL , eR :: esR ) -> d↓ (SeqC (m, s, e :: esL , esR )) eR
      return [
        [
          "down",
          // horizontal compaction
          focusEmpty ? deleteBefore(right(zipper)) : right(zipper),
          undefined,
        ],
      ];
    }
    case "AltC": {
      // | AltC (m) -> d↑ (Alt [e]) m
      const x = up(zipper);
      const children = x.focus.children;
      // vertical compaction
      if (children?.next === null && x.focus.label === "") {
        return [["up", replace(x, children.value), x.focus.m]];
      }
      return [
        [
          "up",
          replace(
            x,
            expressionNode({
              ...x.focus,
              expressionType: "Alt",
              m: undefined,
              end: zipper.focus.end,
            })
          ),
          x.focus.m,
        ],
      ];
    }
    // Extension
    case "RepC": {
      // if Kleene star derives empty string - return nothing,
      // because we already accounted for empty string in `deriveDownPrime` see `case "Rep":`
      if (zipper.focus.start === zipper.focus.end) return [];
      let y = right(zipper);
      y = insertAfter(y, expressionNode(y.focus));
      const x = up(deleteAfter(zipper));
      return [
        [
          "up",
          replace(
            x,
            expressionNode({
              ...x.focus,
              expressionType: "Rep",
              m: undefined,
              end: zipper.focus.end,
            })
          ),
          x.focus.m,
        ],
        ["down", y, undefined],
      ];
    }
    case "LexC": {
      const x = up(zipper);
      return [
        [
          "up",
          replace(
            x,
            expressionNode({
              ...x.focus,
              expressionType: "Lex",
              m: undefined,
              end: zipper.focus.end,
              value: memoInput.slice(x.focus.start, zipper.focus.end).join(""),
              children: null,
            })
          ),
          x.focus.m,
        ],
      ];
    }
    case "IgnC": {
      const x = up(zipper);
      return [
        [
          "up",
          replace(
            x,
            expressionNode({
              ...x.focus,
              ...empty,
              m: undefined,
              end: zipper.focus.end,
              value: "",
            })
          ),
          x.focus.m,
        ],
      ];
    }
    default:
      throw new Error(`Unhandled type: ${zipper.focus.expressionType}`);
  }
}

function deriveDown(position: number, zipper: ExpressionZipper): Step[] {
  const id = zipper.focus;
  let m = mems.get(id, position);
  // match mems.get(p, e) with
  // | Some (m) ->
  if (m) {
    // m.parents <- c :: m.parents;
    // if (m.parents.indexOf(zipper) === -1)
    m.parents.unshift(zipper);
    // List.concat (List.map (fun e -> d′↑ e c) m.result.get(p)
    return (m.result[position] || []).map((focus) => [
      "upPrime",
      replace(zipper, focus),
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
    mems.set(id, position, m);
    // d′↓ m e
    return [["downPrime", zipper, m]];
  }
}

function deriveUp(position: number, zipper: ExpressionZipper, m: Mem): Step[] {
  // m.result.put(p, e :: m.result.get(p));
  if (!m.result[position]) m.result[position] = [];
  // if (
  //   m.result[position].findIndex(
  //     (e) => e.originalId === zipper.focus.originalId
  //   ) === -1
  // )
  m.result[position].unshift(zipper.focus);
  // List.concat (List.map (d′↑ e) m.parents)
  return m.parents.map((c) => ["upPrime", replace(c, zipper.focus), undefined]);
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
          label: up.label,
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
        label: up.label,
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
          label: "",
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
          label: "",
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
  result: Record<ID, { label: string; expressionType: ExpressionType }> = {}
) => {
  if (!tree) return result;
  // break loop
  if (result[tree.id]) return result;
  result[tree.id] = {
    label: tree.label,
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
        label: focus.label,
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
      ([id, { label, expressionType }]) => {
        if (display.nodes[id as any]) {
          display.nodes[id as any].label = label;
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
  const dot = `digraph {
    node [fixedsize=true height=0.3 shape=circle fontcolor=white]
    edge [color="${listColor}"]
    ${toDot(display, logical)}
  }`.trim();

  return { dot, nodes: display.nodes };
};
