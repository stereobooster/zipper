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

/**
 * Kleene star, similar to `x*` from PCRE
 */
export const star = (label: string, child: StrExp) =>
  expressionNode({
    expressionType: "Rep",
    label,
    children: helper([child]),
  });

/**
 * Kleene plus, similar to `x+` from PCRE
 */
export const plus = (label: string, child: StrExp) =>
  seq(label, [child, star("", child)]);

/**
 * Optional item, similar to `x?` from PCRE
 */
export const opt = (label: string, child: StrExp) => alt(label, ["", child]);

/**
 * matches any character, similar to `.` from PCRE
 */
export const any = () =>
  expressionNode({
    expressionType: "Tok",
    label: "\\.",
    children: null,
  });

/**
 * matches any character except the given one, similar to `^x` from PCRE
 */
export const exc = (label: string) =>
  expressionNode({
    expressionType: "Tok",
    label: `^${label}`,
    children: null,
  });

/**
 * Lexical level grammar - for scannerless parser
 */
export const lex = (label: string, child: StrExp) =>
  expressionNode({
    expressionType: "Lex",
    label,
    children: helper([child]),
  });

/**
 * Ignore input, for example spaces, tabs, newlines etc.
 */
export const ign = (label: string, child: StrExp) =>
  expressionNode({
    expressionType: "Ign",
    label,
    children: helper([child]),
  });

/**
 * When we combine operators to form expressions, the order in which the operators are to be applied may
 * not be obvious. For example, `a + b + c` can be interpreted as `((a + b) + c)` or as `(a + (b + c))`.
 * We say that `+` is left-associative if operands are grouped left to right as in `((a + b) + c)`.
 * We say it is right-associative if it groups operands in the opposite direction, as in `(a + (b + c))`.
 * A.V. Aho & J.D. Ullman 1977, p. 47
 */
export const leftAssociative = (
  label: string,
  operator: StrExp,
  variables: StrExp[]
) =>
  rec((c) =>
    alt("", [
      ...variables,
      ...variables.map((variable) => seq(label, [c, operator, variable])),
    ])
  );

export const rightAssociative = (
  label: string,
  operator: StrExp,
  variables: StrExp[]
) =>
  rec((c) =>
    alt("", [
      ...variables,
      ...variables.map((variable) => seq(label, [variable, operator, c])),
    ])
  );
