import { arrayToList } from "./List";
import { Expression, expressionNode } from "./pwz";

// operations from the original paper -----------------------------------------

/**
 * token
 */
export const tok = (label: string) =>
  expressionNode({
    expressionType: "Tok",
    label,
    children: null,
  });

type StrExp = string | Expression;
const helper = (arr: StrExp[]) =>
  arrayToList(arr.map((x) => (typeof x === "string" ? tok(x) : x)));

/**
 * concatenation
 */
export const seq = (label: string, children: StrExp[]) =>
  expressionNode({
    expressionType: "Seq",
    label,
    children: helper(children),
  });

/**
 * unordered choice
 */
export const alt = (label: string, children: StrExp[]) =>
  expressionNode({
    expressionType: "Alt",
    label,
    children: helper(children),
  });

/**
 * instead of OCAML's `letrec`
 */
export const rec = (cb: (x: Expression) => Expression): Expression => {
  const res = {} as any;
  const tmp = cb(res);
  Object.entries(tmp).forEach(([k, v]) => (res[k] = v));
  return res;
};

// Extension ------------------------------------------------------------------

/**
 * Kleene star expressed as S -> ϵ | x S
 */
// export const star = (label: string, x: Expression) =>
//   rec((s) => alt(label, [tok(""), seq("", [x, s])]));

export const star = (label: string, child: StrExp) =>
  expressionNode({
    expressionType: "Rep",
    label,
    children: helper([child]),
  });

/**
 * matches any character, similar to `.` from PCRE
 */
export const any = () =>
  expressionNode({
    expressionType: "TokAny",
    label: "",
    children: null,
  });

/**
 * matches any character except the given one, similar to `^x` from PCRE
 */
export const exc = (label: string) =>
  expressionNode({
    expressionType: "TokExc",
    label,
    children: null,
  });
