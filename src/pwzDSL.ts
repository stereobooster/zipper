import { arrayToList, cons } from "./List";
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

/**
 * concatenation
 */
export const seq = (value: string, children: Expression[]) =>
  expressionNode({
    expressionType: "Seq",
    value,
    children: arrayToList(children),
  });

/**
 * unordered choice
 */
export const alt = (value: string, children: Expression[]) =>
  expressionNode({
    expressionType: "Alt",
    value,
    children: arrayToList(children),
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

// extension ------------------------------------------------------------------

/**
 * Kleene star expressed as S -> ϵ | x S
 */
// export const star = (value: string, x: Expression) =>
//   rec((s) => alt(value, [tok(""), seq("", [x, s])]));

export const star = (value: string, child: Expression) =>
  expressionNode({
    expressionType: "Rep",
    value,
    children: cons(child, null),
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
