// Chomsky-BNF-like grammar, for example `S -> a | "b"`
import { Expression, mapToArray, parse } from "./pwz";
import { alt, exc, ign, lex, plus, recs, seq, star, tok } from "./pwzDSL";

// Non-terminal or symbol
const nonTerminal = lex("NT", plus("a-z"));
// Terminal or string
const terminal = seq([
  ign('"'),
  lex("T", star(alt([exc('"'), seq(["\\", '"'])]))),
  ign('"'),
]);
const arrow = ign("→", seq(["-", ">"]));
const spaceOptional = ign(star(" "));
const space = ign("Space", plus(" "));
const ruleBody = recs((al, se) => {
  const variable = alt([
    terminal,
    nonTerminal,
    seq([ign("("), spaceOptional, al, spaceOptional, ign(")")]),
  ]);
  return [
    // ALt
    alt([se, seq("Alt", [se, spaceOptional, ign("|"), spaceOptional, al])]),
    // Seq
    alt([variable, seq("Seq", [variable, space, se])]),
  ];
})[0];

const rule = seq("Rule", [
  nonTerminal,
  spaceOptional,
  arrow,
  spaceOptional,
  ruleBody,
]);

export const grammarExpression = rule;

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
    if (tree.label === "T") return tok(tree.value!);
    if (tree.label === "NT") return get(tree.value!);
    if (tree.label === "Seq")
      return seq(label, mapToArray(tree.children, ruleToExpression));
    if (tree.label === "Alt")
      return alt(label, mapToArray(tree.children, ruleToExpression));
    throw new Error(`Unkown type ${tree.label}`);
  }
  const addRule = (tree: Expression) => {
    if (tree.label !== "Rule") throw new Error(`Expects Rule`);
    const first = tree.children?.value;
    const second = tree.children?.next?.value;
    if (!first || !second) throw new Error(`Expects two children for Rule`);
    if (first.label !== "NT")
      throw new Error(`Expects non terminale for the name of the Rule`);
    return set(first.value!, ruleToExpression(second, first.value!));
  };
  // TODO: support many rules
  // TODO: check for missing NT definitions
  return addRule(tree);
}

export const parseGrammar = (str: string) => {
  const exps = parse(str, grammarExpression);
  if (exps.length === 0) throw new Error("Failed to parse grammar");
  if (exps.length > 1) throw new Error("Result is ambigious");
  return evaluate(exps[0]);
};
