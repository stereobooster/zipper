// Chomsky-BNF-like grammar, for example `S -> a | "b"`
import { forEach, mapToArray } from "./LcrsTree";
import { Expression, parse } from "./lcrsPwz";
import {
  alt,
  exc,
  ign,
  lex,
  opt,
  plus,
  recs,
  seq,
  star,
  tok,
} from "./lcrsPwzDSL";

// Non-terminal or symbol
const nonTerminal = lex("NT", plus(alt(["a-z", "A-Z", "_"])));
// Terminal or string
const terminal = seq([
  ign('"'),
  lex("T", star(alt([exc('"'), seq(["\\", '"'])]))),
  ign('"'),
]);
const arrow = ign("→", seq(["-", ">"]));
const spaceOptional = ign("Space?", star(" \t"));
const space = ign("Space", plus(" \t"));
const ruleBody = recs((al, se) => {
  const variable = alt([
    terminal,
    nonTerminal,
    seq([ign("("), spaceOptional, al, spaceOptional, ign(")")]),
  ]);
  const starRule = seq("Star", [variable, ign("*")]);
  const plusRule = seq("Plus", [variable, ign("+")]);
  const optRule = seq("Opt", [variable, ign("?")]);
  const altRule = alt([
    se,
    starRule,
    plusRule,
    optRule,
    seq("Alt", [se, spaceOptional, ign("|"), spaceOptional, al]),
  ]);
  const seqRule = alt([variable, seq("Seq", [variable, space, se])]);
  return [altRule, seqRule];
})[0];
const rule = seq("Rule", [
  nonTerminal,
  spaceOptional,
  arrow,
  spaceOptional,
  ruleBody,
  spaceOptional,
]);
const lineEnd = ign(star("  \t\r\n"));
const rules = star("Rules", seq([rule, ign(";"), lineEnd]));

export const grammarExpression = rules;

const isEmpty = (obj: Record<any, any>) => Object.keys(obj).length === 0;

export function evaluate(tree: Expression) {
  const env: Record<string, Expression> = {};
  const get = (name: string) => {
    if (!env[name]) env[name] = {} as any;
    return env[name];
  };
  const set = (name: string, value: Expression) => {
    const tmp = get(name);
    if (!isEmpty(tmp)) throw new Error(`Already declared ${name}`);
    // @ts-expect-error ignore
    Object.entries(value).forEach(([k, v]) => (tmp[k] = v));
    return tmp;
  };
  function ruleToExpression(tree: Expression, label = ""): Expression {
    if (tree.value.label === "T") return tok(tree.value.value!);
    if (tree.value.label === "NT") return get(tree.value.value!);
    if (tree.value.label === "Seq")
      return seq(
        label,
        mapToArray("right", tree.down, (x) => ruleToExpression(x as Expression))
      );
    if (tree.value.label === "Alt")
      return alt(
        label,
        mapToArray("right", tree.down, (x) => ruleToExpression(x as Expression))
      );
    if (tree.value.label === "Star")
      return star(label, ruleToExpression(tree.down!));
    if (tree.value.label === "Plus")
      return plus(label, ruleToExpression(tree.down!));
    if (tree.value.label === "Opt")
      return opt(label, ruleToExpression(tree.down!));
    throw new Error(`Unkown type ${tree.value.label}`);
  }
  const addRule = (tree: Expression) => {
    if (tree.value.label !== "Rule") throw new Error(`Expects Rule`);
    const first = tree.down?.value;
    const second = tree.down?.right;
    if (!first || !second) throw new Error(`Expects two children for Rule`);
    if (first.label !== "NT")
      throw new Error(`Expects non terminale for the name of the Rule`);
    return set(first.value!, ruleToExpression(second, first.value!));
  };
  if (tree.value.label !== "Rules") throw new Error(`Expects Rules`);
  forEach("right", tree.down, (x) => addRule(x as Expression));
  const keys = Object.keys(env);
  keys.forEach((key) => {
    if (isEmpty(env[key])) throw new Error(`Undefined non-terminal ${key}`);
  });
  // last line considered as "start" rule
  return env[keys[keys.length - 1]];
}

export const parseGrammar = (str: string) => {
  str = str.trim();
  if (str.length === 0) throw new Error("Empty input");
  const exps = parse(str, grammarExpression);
  if (exps.length === 0) throw new Error("Failed to parse grammar");
  if (exps.length > 1) throw new Error("Result is ambigious");
  return evaluate(exps[0] as Expression);
};
