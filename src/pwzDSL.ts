import { arrayToList } from "./List";
import { Expression, expressionNode } from "./pwz";

export const tok = (value: string) =>
  expressionNode({
    expressionType: "Tok",
    value,
    children: null,
  });

export const seq = (value: string, children: Expression[]) =>
  expressionNode({
    expressionType: "Seq",
    value,
    children: arrayToList(children),
  });

export const alt = (value: string, children: Expression[]) =>
  expressionNode({
    expressionType: "Alt",
    value,
    children: arrayToList(children),
  });

/**
 * Kleen star expressed as S -> ϵ | xS
 */
export const star = (x: Expression) => {
  const empty = tok("");
  const s = seq("", [x, empty]);
  const res = alt("*", [empty, s]);
  const tmp = res.children?.next?.value.children?.next as any;
  tmp.value = res;
  return res;
};

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

// TODO rec
