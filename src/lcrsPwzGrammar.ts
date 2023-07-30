// Chomsky-BNF-like grammar, for example `S -> a | "b"`
import { forEach, mapToArray } from "./LcrsTree";
import { Expression, parse } from "./lcrsPwz";
import {
  alt,
  any,
  exc,
  ign,
  lex,
  nla,
  opt,
  ord,
  pla,
  plus,
  recs,
  seq,
  star,
  tok,
} from "./lcrsPwzDSL";

// Non-terminal or symbol
const nonTerminal = lex("NT", plus(alt(["a-z", "A-Z", "_"])));
// Terminal or string
const str = seq([
  ign('"'),
  lex("String", star(alt([exc('"'), seq(["\\", '"'])]))),
  ign('"'),
]);
const charClass = seq([
  ign("["),
  lex("CharClass", star(alt([exc("]"), seq(["\\", "]"])]))),
  ign("]"),
]);
const arrow = ign("→", seq(["-", ">"]));
const spaceOptional = ign("Space?", star(" \t"));
const space = ign("Space", plus(" \t"));
const ruleBody = recs((rb, v) => {
  const variable = alt([
    str,
    charClass,
    nonTerminal,
    seq([ign("("), spaceOptional, rb, spaceOptional, ign(")")]),
    seq("Any", [ign(".")]),
    seq("Star", [v, ign("*")]),
    seq("Plus", [v, ign("+")]),
    seq("Opt", [v, ign("?")]),
    // not sure about this syntax, but let's try it
    seq("Lex", [
      ign(seq(["l", "e", "x", "("])),
      spaceOptional,
      v,
      spaceOptional,
      ign(")"),
    ]),
    seq("Ign", [
      ign(seq(["i", "g", "n", "("])),
      spaceOptional,
      v,
      spaceOptional,
      ign(")"),
    ]),
  ]);

  // `S -> ~"a"*` is ambigious
  const lookahead = alt([
    variable,
    seq("Pla", [ign("~"), variable]),
    seq("Nla", [ign("!"), variable]),
  ]);

  const seqRule = seq("Seq", [lookahead, plus(seq([space, lookahead]))]);
  const altVariable = alt([lookahead, seqRule]);
  const altRule = seq("Alt", [
    altVariable,
    plus(seq([spaceOptional, ign("|"), spaceOptional, altVariable])),
  ]);

  const ordVariable = alt([lookahead, altRule]);
  const ordRule = seq("Ord", [
    ordVariable,
    spaceOptional,
    ign("/"),
    spaceOptional,
    rb,
  ]);

  const ruleBody = alt([lookahead, seqRule, altRule, ordRule]);
  return [ruleBody, variable];
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

const escapeSequences: Record<string, string> = {
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  v: "\v",
  '"': '"',
};

const unescapeString = (str: string): string[] => {
  const chars = [...str];
  const res: string[] = [];
  let i = 0;
  do {
    const char = chars[i];
    const nextChar = chars[i + 1];
    if (char === "\\" && escapeSequences[nextChar]) {
      res.push(escapeSequences[nextChar]);
      i += 2;
    } else {
      res.push(char);
      i += 1;
    }
  } while (i < chars.length);
  return res;
};

export function evaluate(tree: Expression) {
  const env: Record<string, Expression> = Object.create(null);
  const get = (name: string) => {
    if (!env[name]) env[name] = Object.create(null) as any;
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
    if (label.startsWith("_")) label = "";
    switch (tree.value.label) {
      case "CharClass":
        return tok(tree.value.value!.replaceAll("\\]", "]"));
      case "String": {
        const chars = unescapeString(tree.value.value!);
        if (chars.length <= 1) return tok(tree.value.value!);
        return seq(chars);
      }
      case "NT":
        return get(tree.value.value!);
      case "Seq":
        return seq(
          label,
          mapToArray("right", tree.down, (x) =>
            ruleToExpression(x as Expression)
          )
        );
      case "Alt":
        return alt(
          label,
          mapToArray("right", tree.down, (x) =>
            ruleToExpression(x as Expression)
          )
        );
      case "Ord":
        return ord(
          label,
          mapToArray("right", tree.down, (x) =>
            ruleToExpression(x as Expression)
          )
        );
      case "Star":
        return star(label, ruleToExpression(tree.down!));
      case "Plus":
        return plus(label, ruleToExpression(tree.down!));
      case "Opt":
        return opt(label, ruleToExpression(tree.down!));
      case "Pla":
        return pla(label, ruleToExpression(tree.down!));
      case "Nla":
        return nla(label, ruleToExpression(tree.down!));
      case "Lex":
        return lex(label, ruleToExpression(tree.down!));
      case "Ign":
        return ign(label, ruleToExpression(tree.down!));
      case "Any":
        return any();
      default:
        throw new Error(`Unknown operator: ${tree.value.label}`);
    }
  }
  let last: string;
  const addRule = (tree: Expression) => {
    if (tree.value.label !== "Rule") throw new Error(`Expects Rule`);
    const first = tree.down?.value;
    const second = tree.down?.right;
    if (!first || !second) throw new Error(`Expects two children for Rule`);
    if (first.label !== "NT")
      throw new Error(`Expects non terminale for the name of the Rule`);
    last = first.value!;
    return set(first.value!, ruleToExpression(second, first.value!));
  };
  if (tree.value.label !== "Rules") throw new Error(`Expects Rules`);
  forEach("right", tree.down, (x) => addRule(x as Expression));
  const keys = Object.keys(env);
  keys.forEach((key) => {
    if (isEmpty(env[key])) throw new Error(`Undefined non-terminal ${key}`);
  });
  // last line considered as "start" rule
  return env[last!];
}

export const parseGrammar = (str: string) => {
  str = str.trim();
  if (str.length === 0) throw new Error("Empty input");
  const exps = parse(str, grammarExpression);
  if (exps.length > 1) console.warn("Result is ambigious");
  return evaluate(exps[0] as Expression);
};
