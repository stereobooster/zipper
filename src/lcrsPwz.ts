import {
  Edge,
  LcrsTree,
  LcrsZipper,
  NodeType,
  NodesIndex,
  PartialLcrsZipper,
  deleteAfter,
  deleteBefore,
  down,
  edgesToDot,
  getLevel,
  insertAfter,
  insertBefore,
  left,
  levelsDot,
  mapToArray,
  memoizeWeakChain,
  node,
  prevIdTransaction,
  ranksDot,
  right,
  treeToZipper,
  up,
  zipperDot,
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
  const [steps, position, , , error] = deriveFinalSteps(str, tree);
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
  let error = false;
  do {
    if (targetCycle === cycle) break;
    const token = str[position] || "";
    const [newSteps, newPosition, newStep] = processSteps(
      token,
      position === str.length,
      position,
      steps
    );
    if (newSteps.length === 0) {
      error = true;
      break;
    }
    position = newPosition;
    steps = newSteps;
    step = newStep;
    cycle += 1;
  } while (position <= str.length);

  mems.reset();
  memoInput.length = 0;
  return [steps, position, step, cycle, error] as const;
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

const verticalCompaction = (zipper: ExpressionZipper) => {
  if (treeCompaction && zipper.value.label === "" && zipper.down) {
    return deleteAfter(left(insertBefore(zipper, zipper.down)));
  }
  return zipper;
};

const deriveDownPrime = prevIdTransaction(
  (
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
);

const deriveUpPrime = prevIdTransaction((zipper: ExpressionZipper): Step[] => {
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
});

const deriveDown = prevIdTransaction(
  (position: number, zipper: ExpressionZipper, dryRun: boolean): Step[] => {
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
      if (!dryRun) mems.set(id, position, m);
      // d′↓ m e
      return [["downPrime", zipper, m]];
    }
  }
);

const deriveUp = prevIdTransaction(
  (
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
    ]);
  }
);

function deriveStep(
  position: number,
  token: string,
  step: Step,
  dryRun = false
): Step[] {
  const [direction, zipper, m] = step;
  switch (direction) {
    case "down":
      return deriveDown(position, zipper, dryRun);
    case "up":
      if (!m) console.log("undefined m");
      return deriveUp(position, zipper, m!, dryRun);
    case "downPrime":
      if (!m) console.log("undefined m");
      return deriveDownPrime(position, token, zipper, m!);
    case "upPrime":
      return deriveUpPrime(zipper);
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
      }
    }
    // https://graphviz.org/doc/info/shapes.html
    const shape = label.length <= 1 ? "square" : "rect";
    label = label.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const rounded = !m;

    return `${id} [id=${id} penwidth=4 style="filled,solid${
      rounded ? ",rounded" : ""
    }" label="${label}" color="${borderColor}" fillcolor="${fillColor}" fontcolor="${fontcolor}" shape=${shape}]`;
  }
);

export const stepsToDot = ({
  steps,
  logical,
  mem,
  position,
  token,
}: {
  steps: Step[];
  logical: boolean;
  mem: boolean;
  position?: number;
  token?: string;
}) => {
  const index: NodesIndex<ExpressionValue> = {};
  steps.forEach((step) => {
    const [, zipper, m] = step;
    const newIndex = zipperDot(
      zipper,
      "focus",
      mem
    ) as NodesIndex<ExpressionValue>;
    Object.entries(newIndex).forEach(([id, item]) => {
      if (!index[id]) index[id] = item;
      else
        index[id] = {
          ...(index[id].type === "purple" ? item : index[id]),
          level: Math.max(index[id].level, item.level),
        };
    });

    // stupid workaround to fix BUG: left-edge of focus is wrong color
    if (zipper.left) {
      index[zipper.id].dagEdges = index[zipper.id].dagEdges.map((e) =>
        e.from === zipper.left?.id ? { ...e, type: "blue" } : e
      );
      index[zipper.id].lcrsEdges = index[zipper.id].lcrsEdges.map((e) =>
        e.from === zipper.left?.id ? { ...e, type: "blue" } : e
      );
    }

    if (m && mem) {
      m.parents.forEach((p) => {
        // show empty node if there are no nodes above?
        if (!p.up) return;
        const newIndex = zipperDot(
          p.up,
          "purple",
          true,
          mem,
          getLevel(zipper) - 1
        ) as NodesIndex<ExpressionValue>;
        Object.entries(newIndex).forEach(([id, item]) => {
          if (!index[id]) index[id] = item;
          else
            index[id] = {
              ...index[id],
              level: Math.max(index[id].level, item.level),
            };
        });

        if (p.up.id !== zipper.up?.id)
          index[zipper.id].memEdges.push({
            from: p.up.id,
            to: zipper.id,
            type: "purple",
            constraint: false,
            direction: "backward",
          });
      });
    }

    // it kind of works but...
    // - do I need to take into account m.results?
    // - also need to add memoization
    // - shall I draw empty node for TopC?
    // - bug on cycle 50 - need to show different arrow https://thenewcode.com/1068/Making-Arrows-in-SVG
    //   or different color
    let [direction] = step;
    if (position !== undefined && token !== undefined) {
      let zipperNext;
      if (direction === "none") {
        direction = "up";
        const newStep = [direction, step[1], step[2]] as Step;
        zipperNext = deriveStep(position, token, newStep, true);
      } else {
        zipperNext = deriveStep(position, token, step, true);
      }
      if (
        zipperNext.length === 1 &&
        (direction === "up" || direction === "down")
      ) {
        zipperNext = zipperNext.flatMap((s) =>
          deriveStep(position, token, s, true)
        );
      }
      const zipperNextIds = new Set(
        zipperNext.flatMap(([_, z]) => {
          if (direction === "up" || direction === "upPrime") {
            if (zipper.right?.loop && zipper.right?.down?.id === z.prevId) {
              return [zipper.right.id];
            }
            return zipper.up?.id === z.prevId || zipper.right?.id === z.prevId
              ? [z.prevId]
              : [z.up?.id, z.prevId];
          }
          if (direction === "down" || direction === "downPrime")
            return zipper.down?.loop && zipper.down?.down?.id === z.prevId
              ? [zipper.down.id]
              : [z.prevId];
          return [z.prevId];
        })
      );
      const edgeTypes = ["dagEdges", "lcrsEdges", "memEdges"] as const;
      edgeTypes.forEach((et) => {
        index[zipper.id][et] = index[zipper.id][et].map((e) => {
          if (
            (e.from !== zipper.id && zipperNextIds.has(e.from)) ||
            (e.to !== zipper.id && zipperNextIds.has(e.to))
          ) {
            return { ...e, type: "pink" };
          }
          return e;
        });
      });
      // if zipper stays in place
      if (
        zipperNextIds.has(zipper.id) &&
        (direction === "down" || direction === "downPrime")
      ) {
        const edge: Edge = {
          from: zipper.id,
          to: zipper.id,
          type: "pink",
          constraint: false,
        };
        index[zipper.id].dagEdges.push(edge);
        index[zipper.id].lcrsEdges.push(edge);
      }
      // if next move would remove zipper
      if (zipperNextIds.size === 0) {
        // maybe draw whole zipper in grey?
        index[zipper.id].type = "gray";
        index[zipper.id].dagEdges = index[zipper.id].dagEdges.map((e) => ({
          ...e,
          type: "gray",
        }));
        index[zipper.id].lcrsEdges = index[zipper.id].lcrsEdges.map((e) => ({
          ...e,
          type: "gray",
        }));
      }
    }
  });
  const graphPieces = Object.values(index).flatMap((x) => [
    expressionToDot(x.zipper, x.type),
    edgesToDot(logical ? x.dagEdges : x.lcrsEdges),
    mem ? edgesToDot(x.memEdges) : [],
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
