import {
  LcrsTree,
  LcrsZipper,
  PartialLcrsZipper,
  deleteAfter,
  deleteBefore,
  down,
  insertAfter,
  insertBefore,
  left,
  mapToArray,
  node,
  right,
  treeToZipper,
  up,
} from "./LcrsTree";
import { Memo } from "./lcrsPwzMemo";

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
      value: {} as any,
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

export type DeriveDirection = "down" | "up" | "none" | "downPrime" | "upPrime";
export type Step = [DeriveDirection, ExpressionZipper, Mem | undefined];

const mems = new Memo<Mem>();
// primitive implementation, but good enough for prototype
const memoInput: string[] = [];
let treeCompaction = false;

export function parse(str: string, tree: Expression) {
  const treeCompactionPrev = treeCompaction;
  treeCompaction = true;
  const [steps] = deriveFinalSteps(str, tree);
  treeCompaction = treeCompactionPrev;
  return steps.map(([, z]) => z);
}

export function deriveFinalSteps(
  str: string,
  tree: Expression,
  targetCycle = -1
) {
  mems.reset();
  memoInput.length = 0;
  let steps: Step[] = [["down", treeToZipper(tree), undefined]];
  let position = 0;
  let step = 0;
  let cycle = 0;
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
    cycle += 1;
    if (targetCycle === cycle) break;
    if (steps.length === 0) break;
  } while (position <= str.length);

  mems.reset();
  memoInput.length = 0;
  return [steps, position, step, cycle] as const;
}

export function processSteps(
  token: string,
  end: boolean,
  position: number,
  steps: Step[]
) {
  memoInput[position] = token;

  let currentStep = steps.findIndex(([d]) => d !== "none");
  if (currentStep === -1) {
    currentStep = 0;
    position = position + 1;
    if (!end) steps = steps.map(([, z, m]) => ["up", z, m]);
  }

  const newSteps = deriveStep(position, token, steps[currentStep]);
  steps = steps.flatMap((step, i) => (i === currentStep ? newSteps : [step]));

  if (end)
    steps = steps.map(([d, z, m]) =>
      d === "up" && z.up === null ? ["none", z, m] : [d, z, m]
    );

  let nextStep = steps.findIndex(([d]) => d !== "none");
  if (nextStep === -1) nextStep = 0;

  return [steps, position, currentStep, newSteps.length, nextStep] as const;
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
  switch (zipper.value.expressionType) {
    case "Tok":
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
        ],
      ];
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
        ],
      ];
    case "Alt": {
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
      return mapToArray("right", zipper.down, (e) => [
        "down",
        expressionNode({ ...(e.loop ? e.down! : e), up: x, right: null }),
        undefined,
      ]);
    }
    // Extension
    case "Rep": {
      let x = down(
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
      x = insertAfter(x, x);
      return [
        ["down", x, undefined],
        [
          "up",
          expressionNode({
            ...zipper,
            down: null,
            value: {
              ...zipper.value,
              expressionType: "Seq",
              start: position,
              end: position,
              value: "",
            },
          }),
          m,
        ],
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
        ],
      ];
    default:
      throw new Error(`Unhandled type: ${zipper.value.expressionType}`);
  }
}

function deriveUpPrime(zipper: ExpressionZipper): Step[] {
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
            // } else {
            //   throw new Error("can this even happen");
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
          ],
        ];
      }

      let res = right(zipper);
      if (treeCompaction && focusEmpty) {
        // horizontal compaction
        res = deleteBefore(res);
      }

      // | SeqC (m, s, esL , eR :: esR ) -> d↓ (SeqC (m, s, e :: esL , esR )) eR
      return [["down", res, undefined]];
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
        ["up", x, m],
        ["down", y, undefined],
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
              value: memoInput.slice(x.value.start, zipper.value.end).join(""),
            },
          }),
          x.value.m,
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
        ],
      ];
    }
    default:
      throw new Error(`Unhandled type: ${zipper.value.expressionType}`);
  }
}

const verticalCompaction = (zipper: ExpressionZipper) => {
  if (treeCompaction && zipper.value.label === "" && zipper.down) {
    return deleteAfter(left(insertBefore(zipper, zipper.down)));
  }
  return zipper;
};

function deriveDown(position: number, zipper: ExpressionZipper): Step[] {
  const id = zipper.prevId || zipper.id;
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
      verticalCompaction(
        expressionNode({ ...zipper, value: focus.value, down: focus.down })
      ),
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
  m.result[position].unshift(zipper);
  // List.concat (List.map (d′↑ e) m.parents)
  return m.parents.map((c) => [
    "upPrime",
    verticalCompaction(
      expressionNode({ ...c, value: zipper.value, down: zipper.down })
    ),
    undefined,
  ]);
}
