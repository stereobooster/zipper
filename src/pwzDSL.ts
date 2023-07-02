import { arrayToList } from "./List";
import { Expression, expressionNode } from "./pwz";

// operations from the original paper -----------------------------------------

/**
 * token
 */
export const tok = (value: string) =>
  expressionNode({
    expressionType: "Tok",
    value,
    children: null,
  });

type StrExp = string | Expression;
const helper = (arr: StrExp[]) =>
  arrayToList(arr.map((x) => (typeof x === "string" ? tok(x) : x)));

/**
 * concatenation
 */
export const seq = (value: string, children: StrExp[]) =>
  expressionNode({
    expressionType: "Seq",
    value,
    children: helper(children),
  });

/**
 * unordered choice
 */
export const alt = (value: string, children: StrExp[]) =>
  expressionNode({
    expressionType: "Alt",
    value,
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
// export const star = (value: string, x: Expression) =>
//   rec((s) => alt(value, [tok(""), seq("", [x, s])]));

export const star = (value: string, child: StrExp) =>
  expressionNode({
    expressionType: "Rep",
    value,
    children: helper([child]),
  });

/**
 * matches any character, similar to `.` from PCRE
 */
export const any = () =>
  expressionNode({
    expressionType: "TokAny",
    value: "",
    children: null,
  });

/**
 * matches any character except the given one, similar to `^x` from PCRE
 */
export const exc = (value: string) =>
  expressionNode({
    expressionType: "TokExc",
    value,
    children: null,
  });
