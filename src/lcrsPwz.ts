import {
  DisplayItem,
  Edge,
  ID,
  LcrsTree,
  LcrsZipper,
  NodeType,
  NodesIndex,
  PartialLcrsZipper,
  addEdge,
  deleteAfter,
  deleteBefore,
  down,
  edgesToDot,
  getLevel,
  insertAfter,
  insertBefore,
  left,
  levelsDot,
  mapChildren,
  mergeNodesIndex,
  node,
  prevIdTransaction,
  ranksDot,
  right,
  treeToZipper,
  up,
  traverseZipper,
  getId,
} from "./LcrsTree";
import {
  grayColor,
  leftColor,
  listColor,
  purpleColor,
  rightColor,
  zipperColor,
} from "./colors";
import { Memo } from "./lcrsPwzMemo";
import { memoizeWeakChain, getChainSetDefault } from "./memoization";

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
  | "IgnC"
  // positive lookahead
  | "Pla"
  // negative lookahead
  | "Nla";
// Intersection
// | "Int"
// | "IntC";

export type ExpressionValue = {
  expressionType: ExpressionType;
  // S -> a | b
  // For token label would be the token itself i.e. a, b
  // For others label would be the symbol i.e. S
  label: string;
  // cache
  m?: Mem;
  start?: number;
  end?: number;
  value?: string;
};

export type Expression = LcrsTree<ExpressionValue>;

export type Mem = {
  parents: ExpressionZipper[];
  result: Record<number, ExpressionZipper[]>;
};

export type ExpressionZipper = LcrsZipper<ExpressionValue>;
type PartialExpressionZipper = PartialLcrsZipper<ExpressionValue>;

export const expressionNode = (
  nodeProps: PartialExpressionZipper
): ExpressionZipper => {
  const { value } = nodeProps;
  // special handling of a loop
  if (value === undefined) {
    return node({
      loop: true,
      down: nodeProps as ExpressionZipper,
      value: Object.create(null) as any,
    });
  }
  const { label } = value;
  let { expressionType } = value;
  const down = nodeProps.down || null;
  if (expressionType === "Tok" && down !== null)
    throw Error("Token can't have children");
  if (expressionType === "Tok" && label === "") expressionType = "Seq";
  return node({
    ...nodeProps,
    down,
    value: {
      ...value,
      expressionType,
      label,
    },
  });
};

// Derivative ---------------------------------------------------------------------
// https://dl.acm.org/doi/pdf/10.1145/3408990

// Extension: support for character classes
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes
const match = (label: string, token: string): boolean => {
  // TODO: why do we need it. Isn't it handled by Seq?
  if (token === "") return label === "";

  let not = false;
  // negation. PCRE: [^a]
  if (label[0] === "^") {
    label = label.slice(1);
    not = true;
  }
  let result;

  // escapes
  if (label[0] === "\\") {
    // match any letter. PCRE: .
    if (label[1] === ".") result = [...token].length === 1;
    // match `^` token:  PCRE: \^
    if (label[1] === "^") result = token === "^";
    // match `\` token:  PCRE: \\
    if (label[1] === undefined) result = token === "\\";
  }

  if (result === undefined) {
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
  }

  return not ? !result : result;
};

export type DeriveDirection = "down" | "up" | "none" | "downPrime" | "upPrime";
export type Step = [
  DeriveDirection,
  ExpressionZipper,
  Mem | undefined,
  LookaheadId
];

// this is mess
export type LookaheadId = number;
let _lookaheadId = 1;
const getLookaheadId = () => ++_lookaheadId;

type LookaheadMemoRecord = {
  topNode: ID;
  lookahead: LookaheadId | undefined;
  prev: LookaheadId[];
  lookaheadParams:
    | {
        positive: boolean;
        main: LookaheadId;
        success: boolean;
      }
    | undefined;
};
type LookaheadMemo = Record<LookaheadId, LookaheadMemoRecord>;
let lookaheadMemo: LookaheadMemo = Object.create(null);

const addLookahead = (
  oldMain: LookaheadId,
  lookahead: {
    topNode: ID;
    positive: boolean;
  }
) => {
  const laId = getLookaheadId();
  const mainId = getLookaheadId();

  const prevParams = lookaheadMemo[oldMain].lookaheadParams;
  lookaheadMemo[mainId] = {
    topNode: lookaheadMemo[oldMain].topNode,
    prev: [...lookaheadMemo[oldMain].prev, mainId],
    lookahead: laId,
    lookaheadParams: prevParams ? { ...prevParams } : undefined,
  };

  lookaheadMemo[laId] = {
    topNode: lookahead.topNode,
    prev: [laId],
    lookahead: undefined,
    lookaheadParams: {
      positive: lookahead.positive,
      main: mainId,
      success: false,
    },
  };

  return [laId, mainId];
};

const addMain = (step: Step) => {
  const lid = step[3];
  if (lookaheadMemo[lid]) return;
  const zipper = step[1];
  lookaheadMemo[lid] = {
    topNode: zipper.originalId || zipper.id,
    prev: [lid],
    lookahead: undefined,
    lookaheadParams: undefined,
  };
};

const checkLookahead = (
  currentStep: number,
  newSteps: Step[],
  steps: Step[]
): Step[] => {
  const lid = steps[currentStep][3];
  steps = steps.flatMap((step, i) => (i === currentStep ? newSteps : [step]));
  const lookaheadParams = lookaheadMemo[lid].lookaheadParams;
  // not a lookahed - do nothing
  if (!lookaheadParams) return steps;
  const laSid = lid;
  const positive = lookaheadParams.positive;

  if (newSteps.length === 0) {
    let i = lookaheadMemo[laSid].prev.length - 1;
    do {
      const lid = lookaheadMemo[laSid].prev[i];

      const lastOfAKind = steps.filter(([, , , x]) => x === lid).length === 0;

      // do nothing here
      if (!lastOfAKind) return steps;

      // no need to remove lookaheads of this type, because it was last one
      if (positive) {
        lookaheadMemo[lid].lookaheadParams!.success = false;
        // remove all main zippers which require this lookahead
        steps = steps.filter(
          ([, , , x]) =>
            !lookaheadMemo[x].prev.includes(
              lookaheadMemo[lid].lookaheadParams!.main
            )
        );
      } else {
        lookaheadMemo[lid].lookaheadParams!.success = true;
      }

      i--;
    } while (i >= 0);
  }

  let didMatch = false;
  newSteps.forEach((step) => {
    const [d, z, , nsid] = step;
    if (!lookaheadMemo[nsid].lookaheadParams) return;
    if (d !== "up") return;
    if (z.up !== null || z.left !== null || z.right !== null) return;
    if (lookaheadMemo[nsid].topNode !== z.originalId) return;
    didMatch = true;
  });

  if (didMatch) {
    let i = lookaheadMemo[laSid].prev.length - 1;
    do {
      const lid = lookaheadMemo[lookaheadMemo[laSid].prev[i]].lookahead;
      if (lid && !lookaheadMemo[lid].lookaheadParams!.success) {
        didMatch = false;
        break;
      }
      i--;
    } while (i >= 0);
  }

  if (didMatch) {
    let i = lookaheadMemo[laSid].prev.length - 1;
    do {
      const lid = lookaheadMemo[laSid].prev[i];
      // remove lookaheads of this type
      steps = steps.filter(([, , , x]) => x !== lid);

      if (positive) {
        lookaheadMemo[lid].lookaheadParams!.success = true;
      } else {
        lookaheadMemo[lid].lookaheadParams!.success = false;
        // remove all main zippers which require this lookahead
        steps = steps.filter(
          ([, , , x]) =>
            !lookaheadMemo[x].prev.includes(
              lookaheadMemo[lid].lookaheadParams!.main
            )
        );
      }
      i--;
    } while (i >= 0);
  }

  return steps;
};

const mems = new Memo<Mem>();
// primitive implementation, but good enough for prototype
const memoInput: string[] = [];
let treeCompaction = false;

// stupid workaround because I use global variables
export const resetMemtables = () => {
  mems.reset();
  memoInput.length = 0;
  lookaheadMemo = Object.create(null);
  _lookaheadId = 1;
};

export function parse(str: string, tree: Expression) {
  const treeCompactionPrev = treeCompaction;
  treeCompaction = true;
  const initialStep: Step[] = [["down", treeToZipper(tree), undefined, 0]];
  const [steps, position, , , error] = deriveStepsUntil(str, initialStep);
  resetMemtables();
  treeCompaction = treeCompactionPrev;
  if (error)
    // this is not perfect because it can show "Ign" items, which doesn't help
    throw new Error(
      `Failed to parse: expected ${steps
        .map(([, z]) => `"${z.value.label}"`)
        .join(" or ")} at position ${position} instead found ${
        str[position] === undefined ? "EOF" : `"${str[position]}"`
      }`
    );
  return steps.map(([, z]) => z);
}

export function deriveStepsUntil(
  str: string,
  steps: Step[],
  targetCycle = -1,
  targetPosition = -1
) {
  resetMemtables();
  if (steps.length !== 1) throw new Error("Expects one step");

  let position = 0;
  let step = 0;
  let cycle = 0;
  let error = false;
  const maxPosition =
    targetPosition !== -1 ? Math.min(targetPosition, str.length) : str.length;
  do {
    if (targetCycle === cycle) break;
    const token = str[position] || "";
    const [newSteps, newPosition, , , nextStep] = processSteps(
      token,
      position,
      steps
    );
    if (newSteps.length === 0) {
      error = true;
      break;
    }
    if (newPosition > maxPosition && targetPosition !== -1) break;
    position = newPosition;
    steps = newSteps;
    step = nextStep;
    cycle += 1;
  } while (position <= maxPosition);

  return [steps, position, step, cycle, error] as const;
}

export function processSteps(token: string, position: number, steps: Step[]) {
  if (
    steps.filter(
      ([, , , lid]) =>
        !lookaheadMemo[lid] || !lookaheadMemo[lid].lookaheadParams
    ).length === 0
  )
    return [[] as Step[], position, 0, 0, 0] as const;

  // workaround to add first step from which derivation starts
  addMain(steps[0]);

  const end = token === "";
  memoInput[position] = token;

  let currentStep = steps.findIndex(([d]) => d !== "none");
  if (currentStep === -1) {
    currentStep = 0;
    position = position + 1;
    if (!end) steps = steps.map(([, ...rest]) => ["up", ...rest]);
  }

  const newSteps = deriveStep(position, token, steps[currentStep]);
  steps = checkLookahead(currentStep, newSteps, steps);

  if (end)
    steps = steps.map(([d, z, ...rest]) =>
      d === "up" && z.up === null ? ["none", z, ...rest] : [d, z, ...rest]
    );

  let nextStep = steps.findIndex(([d]) => d !== "none");
  if (nextStep === -1) nextStep = 0;

  return [steps, position, currentStep, newSteps.length, nextStep] as const;
}

const verticalCompaction = (zipper: ExpressionZipper) => {
  if (treeCompaction && zipper.value.label === "" && zipper.down) {
    return deleteAfter(left(insertBefore(zipper, zipper.down)));
  }
  return zipper;
};

const deriveDownPrime = prevIdTransaction(
  (
    lid: LookaheadId,
    position: number,
    token: string,
    zipper: ExpressionZipper,
    m: Mem
  ): Step[] => {
    switch (zipper.value.expressionType) {
      case "Tok": {
        // | Tok (t') -> if t = t' then [(Seq (t, []), m)] else []
        if (!match(zipper.value.label, token)) return [];
        return [
          [
            "none",
            expressionNode({
              ...zipper,
              down: null,
              value: {
                ...zipper.value,
                expressionType: "Seq",
                value: token,
                start: position,
                end: position + 1,
              },
            }),
            m,
            lid,
          ],
        ];
      }
      case "Seq":
        // | Seq (s, []) -> d↑ (Seq (s, [])) m
        if (zipper.down === null)
          return [
            [
              "up",
              expressionNode({
                ...zipper,
                value: {
                  ...zipper.value,
                  start: position,
                  end: position,
                  value: "",
                },
              }),
              m,
              lid,
            ],
          ];
        // | Seq (s, e :: es) -> d↓ (SeqC (m, s, [], es)) e
        return [
          [
            "down",
            down(
              expressionNode({
                ...zipper,
                value: {
                  ...zipper.value,
                  expressionType: "SeqC",
                  m,
                  start: position,
                },
              })
            ),
            undefined,
            lid,
          ],
        ];
      case "Alt": {
        // | Alt (es) -> List.concat (List.map (d↓ (AltC m)) es)
        const x = expressionNode({
          ...zipper,
          down: null,
          value: {
            ...zipper.value,
            expressionType: "AltC",
            m,
            start: position,
          },
        });
        return mapChildren(zipper, (e) => [
          "down",
          expressionNode({ ...e, up: x }),
          undefined,
          lid,
        ]);
      }
      // Extension
      case "Rep": {
        const newFocus = down(
          expressionNode({
            ...zipper,
            value: {
              ...zipper.value,
              expressionType: "RepC",
              m,
              start: position,
            },
          })
        );
        const newFocusWithSibling = insertAfter(newFocus, newFocus);

        // this is a mess
        const newFocusWithEmpty = expressionNode({
          ...zipper,
          value: {
            ...zipper.value,
            start: position,
            end: position,
          },
          down: expressionNode({
            ...newFocus,
            down: null,
            up: null,
            value: {
              ...newFocus.value,
              expressionType: "Seq",
              start: position,
              end: position,
              value: "",
            },
          }),
        });

        return [
          ["down", newFocusWithSibling, undefined, lid],
          ["up", newFocusWithEmpty, m, lid],
        ];
      }
      case "Lex":
        return [
          [
            "down",
            down(
              expressionNode({
                ...zipper,
                value: {
                  ...zipper.value,
                  expressionType: "LexC",
                  m,
                  start: position,
                },
              })
            ),
            undefined,
            lid,
          ],
        ];
      case "Ign":
        return [
          [
            "down",
            down(
              expressionNode({
                ...zipper,
                value: {
                  ...zipper.value,
                  expressionType: "IgnC",
                  m,
                  start: position,
                },
              })
            ),
            undefined,
            lid,
          ],
        ];
      case "Nla":
      case "Pla": {
        const withOutLa = expressionNode({
          ...zipper,
          down: null,
          value: {
            ...zipper.value,
            expressionType: "Seq",
            start: position,
            end: position,
            value: "",
          },
        });

        const standAloneLa = expressionNode({
          ...zipper,
          // need to do this, so that they won't be sharing mem
          prevId: getId(),
          left: null,
          right: null,
          up: null,
          value: {
            ...zipper.value,
            expressionType: "Seq",
          },
        });

        const [laId, mainId] = addLookahead(lid, {
          topNode: standAloneLa.originalId || standAloneLa.id,
          positive: zipper.value.expressionType === "Pla",
        });

        return [
          ["down", standAloneLa, undefined, laId],
          zipper.right
            ? ["down", deleteBefore(right(withOutLa)), undefined, mainId]
            : ["up", withOutLa, m, mainId],
        ];
      }
      default:
        throw new Error(`Unhandled type: ${zipper.value.expressionType}`);
    }
  }
);

const deriveUpPrime = prevIdTransaction(
  (lid: LookaheadId, zipper: ExpressionZipper): Step[] => {
    // | TopC -> []
    if (zipper.up === null) return [];
    switch (zipper.up.value.expressionType) {
      case "SeqC": {
        const focusEmpty =
          (zipper.value.expressionType !== "Lex" &&
            zipper.value.start === zipper.value.end) ||
          (zipper.value.expressionType === "Seq" &&
            zipper.down === null &&
            zipper.value.value === "");
        // | SeqC (m, s, es, []) -> d↑ (Seq (s, List.rev (e :: es))) m
        if (zipper.right === null) {
          let res = zipper;
          if (treeCompaction && focusEmpty) {
            // horizontal compaction
            if (zipper.left !== null) {
              res = deleteAfter(left(zipper));
            }
          }
          res = up(res);
          return [
            [
              "up",
              expressionNode({
                ...res,
                value: {
                  ...res.value,
                  expressionType: "Seq",
                  m: undefined,
                  end: zipper.value.end,
                },
              }),
              res.value.m,
              lid,
            ],
          ];
        }

        let res = right(zipper);
        if (treeCompaction && focusEmpty) {
          // horizontal compaction
          res = deleteBefore(res);
        }

        // | SeqC (m, s, esL , eR :: esR ) -> d↓ (SeqC (m, s, e :: esL , esR )) eR
        return [["down", res, undefined, lid]];
      }
      case "AltC": {
        // | AltC (m) -> d↑ (Alt [e]) m
        const x = up(zipper);
        return [
          [
            "up",
            expressionNode({
              ...x,
              value: {
                ...x.value,
                expressionType: "Alt",
                m: undefined,
                end: zipper.value.end,
              },
            }),
            x.value.m,
            lid,
          ],
        ];
      }
      // Extension
      case "RepC": {
        // if Kleene star derives empty string - return nothing,
        // because we already accounted for empty string in `deriveDownPrime` see `case "Rep":`
        if (zipper.value.start === zipper.value.end) return [];
        let y = right(zipper);
        y = insertAfter(y, y);
        let x = up(deleteAfter(zipper));
        const m = x.value.m;
        x = expressionNode({
          ...x,
          value: {
            ...x.value,
            expressionType: "Rep",
            m: undefined,
            end: zipper.value.end,
          },
        });

        return [
          ["up", x, m, lid],
          ["down", y, undefined, lid],
        ];
      }
      case "LexC": {
        const x = up(zipper);
        return [
          [
            "up",
            expressionNode({
              ...x,
              down: null,
              value: {
                ...x.value,
                expressionType: "Lex",
                m: undefined,
                end: zipper.value.end,
                value: memoInput
                  .slice(x.value.start, zipper.value.end)
                  .join(""),
              },
            }),
            x.value.m,
            lid,
          ],
        ];
      }
      case "IgnC": {
        const x = up(zipper);
        return [
          [
            "up",
            expressionNode({
              ...x,
              down: null,
              value: {
                ...x.value,
                expressionType: "Seq",
                m: undefined,
                end: zipper.value.end,
                value: "",
              },
            }),
            x.value.m,
            lid,
          ],
        ];
      }
      default:
        throw new Error(`Unhandled type: ${zipper.value.expressionType}`);
    }
  }
);

const deriveDown = prevIdTransaction(
  (
    lid: LookaheadId,
    position: number,
    zipper: ExpressionZipper,
    dryRun: boolean
  ): Step[] => {
    const id = zipper.prevId || zipper.id;
    let m = mems.get(id, position);
    // match mems.get(p, e) with
    // | Some (m) ->
    if (m) {
      // m.parents <- c :: m.parents;
      if (!dryRun) m.parents.unshift(zipper);
      // List.concat (List.map (fun e -> d′↑ e c) m.result.get(p)
      return (m.result[position] || []).map((focus) => [
        "upPrime",
        verticalCompaction(
          expressionNode({ ...zipper, value: focus.value, down: focus.down })
        ),
        undefined,
        lid,
      ]);
    }
    // | None ->
    else {
      // let m = { parents = [c]; result = ∅ } in
      m = {
        parents: [zipper],
        result: Object.create(null),
      };
      // mems.put(p, e, m);
      if (!dryRun) mems.set(id, position, m);
      // d′↓ m e
      return [["downPrime", zipper, m, lid]];
    }
  }
);

const deriveUp = prevIdTransaction(
  (
    lid: LookaheadId,
    position: number,
    zipper: ExpressionZipper,
    m: Mem,
    dryRun: boolean
  ): Step[] => {
    // m.result.put(p, e :: m.result.get(p));
    if (!dryRun) {
      if (!m.result[position]) m.result[position] = [];
      m.result[position].unshift(zipper);
    }
    // List.concat (List.map (d′↑ e) m.parents)
    return m.parents.map((c) => [
      "upPrime",
      verticalCompaction(
        expressionNode({ ...zipper, up: c.up, left: c.left, right: c.right })
      ),
      undefined,
      lid,
    ]);
  }
);

function deriveStep(
  position: number,
  token: string,
  step: Step,
  dryRun = false
): Step[] {
  const [direction, zipper, m, id] = step;
  switch (direction) {
    case "down":
      return deriveDown(id, position, zipper, dryRun);
    case "up":
      if (!m) console.log("undefined m");
      return deriveUp(id, position, zipper, m!, dryRun);
    case "downPrime":
      if (!m) console.log("undefined m");
      return deriveDownPrime(id, position, token, zipper, m!);
    case "upPrime":
      return deriveUpPrime(id, zipper);
    case "none":
      return [step];
  }
}

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
      fillColor = "white";
      fontcolor = "black";
      borderColor = grayColor;
    } else if (type === "purple" && originalId !== undefined) {
      fillColor = purpleColor;
      borderColor = purpleColor;
    }
    if (loop) {
      fillColor = "white";
      fontcolor = "black";
    }

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
      } else if (expressionType === "Pla") {
        label = short ? "~" : "Pla";
      } else if (expressionType === "Nla") {
        label = short ? "!" : "Nla";
      }
    } else if (label === "\\." && expressionType === "Tok") {
      label = "★"; // Σ 🃏
    }

    // https://graphviz.org/doc/info/shapes.html
    const shape = [...label].length <= 1 ? "square" : "rect";
    label = label.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const rounded = !m;

    return `${id} [id=${id} penwidth=4 style="filled,solid${
      rounded ? ",rounded" : ""
    }" label="${label}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}]`;
  }
);

const edgeTypes = ["dagEdges", "lcrsEdges", "memEdges"] as const;

// this is a mess, but works
const indexByOriginalId = (nodes: NodesIndex<ExpressionValue>) => {
  const index: Record<ID, Record<number, Record<number, ID[]>>> = Object.create(
    null
  );
  const duplicates: Record<ID, ID> = Object.create(null);
  Object.values(nodes)
    .sort((a, b) => b.level - a.level)
    .sort((a, b) => {
      if (a.zipper.down === null && b.zipper.down === null) return 0;
      if (a.zipper.down !== null && b.zipper.down !== null) return 0;
      return b.zipper.down === null ? 1 : -1;
    })
    .forEach((item) => {
      const { type } = item;
      const { start, end } = item.zipper.value;
      const { originalId } = item.zipper;
      const { id } = item.zipper;
      if (start === undefined || end === undefined || originalId === undefined)
        return;

      const ids: ID[] = getChainSetDefault(
        index,
        [originalId, type, start, end],
        []
      );
      ids.forEach((prevId) => {
        const children1 = mapChildren(item.zipper, (c) => c.id);
        const children2 = mapChildren(nodes[prevId].zipper, (c) => c.id);
        let same = true;
        if (children1.length !== children2.length) {
          same = false;
        } else {
          let i = 0;
          while (i < children1.length) {
            const id1 = children1[i];
            const id2 = children2[i];
            if (
              id1 === id2 ||
              id1 === duplicates[id2] ||
              duplicates[id1] === id2 ||
              (duplicates[id1] === duplicates[id2] &&
                duplicates[id1] !== undefined)
            ) {
              i++;
              continue;
            }
            same = false;
            break;
          }
        }
        if (same) duplicates[id] = duplicates[prevId] || prevId;
      });

      ids.push(id);
    });
  return duplicates;
};

const visualCompaction = (nodes: NodesIndex<ExpressionValue>) => {
  const duplicates = indexByOriginalId(nodes);
  if (Object.keys(duplicates).length === 0) return nodes;
  const newNodes: NodesIndex<ExpressionValue> = Object.create(null);
  Object.keys(nodes).forEach((id) => {
    const newItem = newNodes[duplicates[id]]
      ? newNodes[duplicates[id]]
      : { ...nodes[duplicates[id] ? duplicates[id] : id] };
    if (newItem.zipper.originalId !== undefined) {
      edgeTypes.forEach((et) => {
        newItem[et] = {
          ...newItem[et],
          ...nodes[id][et],
        };
        Object.entries(duplicates).forEach(([oldToId, newToid]) => {
          if (newItem[et][oldToId] === undefined) return;
          newItem[et][newToid] = newItem[et][oldToId];
          delete newItem[et][oldToId];
        });
      });
    }
    newNodes[duplicates[id] || id] = newItem;
  });
  return newNodes;
};

const topC: DisplayItem<ExpressionValue> = {
  level: 0,
  zipper: {
    value: {
      expressionType: "Alt",
      label: "TopC",
    },
    right: null,
    down: null,
    up: null,
    left: null,
    id: "TopC",
    originalId: "TopC",
  },
  type: "purple",
  dagEdges: Object.create(null),
  lcrsEdges: Object.create(null),
  memEdges: Object.create(null),
};

const setZipperDirectionEdge = (from: DisplayItem, to: ID | undefined) => {
  if (to === undefined) return;
  edgeTypes.forEach((et) => {
    if (from[et][to] === undefined) return;
    from[et][to].type = "pink";
  });
};

export const stepsToDot = ({
  steps,
  logical,
  mem,
  position,
  token,
  compact,
}: {
  steps: Step[];
  logical: boolean;
  mem: boolean;
  // required for m.result
  position?: number;
  // required to calculate next step
  token?: string;
  compact: boolean;
}) => {
  let index: NodesIndex<ExpressionValue> = Object.create(null);
  steps.forEach((step) => {
    const [, zipper, m] = step;
    const newIndex = traverseZipper(zipper, "focus", mem);
    mergeNodesIndex(index, newIndex, (oldItem, newItem) =>
      oldItem.type === "purple" ? newItem : oldItem
    );

    // stupid workaround to fix BUG: left-edge of focus is wrong color
    if (zipper.left) {
      index[zipper.id].dagEdges[zipper.left?.id].type = "blue";
      index[zipper.id].lcrsEdges[zipper.left?.id].type = "blue";
    }

    if (position !== undefined && token !== undefined) {
      let [direction] = step;
      if (m && (direction === "up" || direction === "upPrime")) {
        m.parents.forEach((p) => {
          // draw TopC nodes if there are no nodes above
          const upId = p.up ? p.up.id : topC.zipper.id;
          if (p.up) {
            const newIndex = traverseZipper(
              p.up,
              "purple",
              false,
              true,
              getLevel(zipper) - 1
            );
            mergeNodesIndex(index, newIndex);
          } else {
            index[topC.zipper.id] = {
              ...topC,
              level: getLevel(zipper) - 1,
            };
          }

          if (upId !== zipper.up?.id) {
            const edge: Edge = {
              type: "pink",
              // special arrowhead for mem parents
              arrowhead: "dot",
            };
            addEdge(index[zipper.id].dagEdges, upId, edge);
            addEdge(index[zipper.id].lcrsEdges, upId, edge);
          }
        });
      }

      if (
        m &&
        m.result[position] &&
        (direction === "down" || direction === "downPrime")
      ) {
        m.result[position].forEach((r) => {
          if (r.id !== zipper.id && zipper.up) {
            const newIndex = traverseZipper(
              r,
              "purple",
              false,
              true,
              getLevel(zipper)
            );
            mergeNodesIndex(index, newIndex);
            const edge: Edge = {
              type: "pink",
            };
            addEdge(index[r.id].dagEdges, zipper.up.id, edge);
            addEdge(index[r.id].lcrsEdges, zipper.up.id, edge);
          }
        });
      }

      // calculate next move
      let zipperNext;
      if (direction === "none") {
        direction = "up";
        const newStep = [direction, step[1], step[2], step[3]] as Step;
        zipperNext = deriveStep(position, token, newStep, true);
      } else {
        zipperNext = deriveStep(position, token, step, true);
      }
      // calculate after-next move, if current one is "borring"
      if (
        zipperNext.length === 1 &&
        (direction === "up" || direction === "down")
      ) {
        zipperNext = zipperNext.flatMap((s) =>
          deriveStep(position, token, s, true)
        );
      }

      // if next move would remove zipper
      if (zipperNext.length === 0 && token !== "") {
        // maybe draw whole zipper in grey?
        index[zipper.id].type = "gray";
        edgeTypes.forEach((et) =>
          Object.keys(index[zipper.id][et]).forEach(
            (to) => (index[zipper.id][et][to].type = "gray")
          )
        );
        return;
      }

      zipperNext.forEach(([d, z]) => {
        if (d === "none") d = "up";
        if (zipper.right?.loop && zipper.right?.down?.id === z.prevId) {
          setZipperDirectionEdge(index[zipper.id], zipper.right.id);
        } else if (zipper.down?.loop && zipper.down?.down?.id === z.prevId) {
          setZipperDirectionEdge(index[zipper.id], zipper.down.id);
        } else if (z.prevId === zipper.id) {
          // don't draw self edge for this case, because it will draw mem-parents edges
          if (d === "upPrime") return;
          // on next move zipper stays in place - add self-edge
          const edge: Edge = {
            type: "pink",
            constraint: false,
          };
          addEdge(index[zipper.id].dagEdges, zipper.id, edge);
          addEdge(index[zipper.id].lcrsEdges, zipper.id, edge);
        } else {
          setZipperDirectionEdge(index[zipper.id], z.prevId);
        }
      });
    }
  });

  if (compact) index = visualCompaction(index);

  const graphPieces = Object.values(index).flatMap((x) => [
    expressionToDot(x.zipper, x.type),
    edgesToDot(logical ? x.dagEdges : x.lcrsEdges, x.zipper.id),
    mem ? edgesToDot(x.memEdges, x.zipper.id) : [],
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
