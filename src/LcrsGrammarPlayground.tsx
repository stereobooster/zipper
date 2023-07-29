import c from "./components/common.module.css";
import { Nobr } from "./components/Nobr";
import { useState } from "react";
import { grammarExpression, parseGrammar } from "./lcrsPwzGrammar";
import { VizualizeLcrsGrammar } from "./VizualizeLcrsGrammar";

const examples = [
  // Lookahead
  // Ford's example for context sensitive grammar with lookahead operators
  // https://github.com/SRI-CSL/PVSPackrat/issues/3
  [
    `A -> "a" A "b" | "";
B -> "b" B "c" | "";
S -> ~(A "c") "a"* B;`,
    "Context sensitive",
    "aabbcc",
  ],
  [`S -> ~("a" "a") .;`, "Lookahead bigger than main", "aa"],
  [`S -> ~("a" !"b") .*;`, "Nested lookahead", "ab"],
  [`S -> (~"a" | ~"b") .;`, "Lookahead in Alt", "a"],
  // is it a bug?
  [`S -> "a" S | "" ~S;`, "Cycle on lookahed 1", "a"],
  [`S -> "a" S | ~S "";`, "Cycle on lookahed 2", "a"],
  [`S -> S "a" | "" ~S;`, "Cycle on lookahed 3", "a"],
  [`S -> S "a" | ~S "";`, "Cycle on lookahed 4", "a"],
  // Algebraic expressions
  [`S -> S "+" S | S "-" S | "0-9";`, "Algebraic expression", "1+2-3+4"],
  [`N -> "0-9"; S -> S "+" N | N;`, "Left associative operation", "1+2+3"],
  [`N -> "0-9"; S -> N "+" S | N;`, "Right associative operation", "1+2+3"],
  [
    `N -> "0-9"; M -> M "*" N | N; S -> S "+" M | M;`,
    "Priority of operations",
    "1+2*3+4",
  ],
  // Kleene star
  [`S -> S "a" | "";`, "Kleene star as left recursion", "aaa"],
  [`S -> "a" S | "";`, "Kleene star as right recursion", "aaa"],
  [`S -> "a"*;`, "Kleene star", "aaa"],
  // Classical context-free grammar
  [`S -> "(" S S ")" | "";`, "Matching parenthesis #1", "(()())"],
  [`S -> ("(" S ")")*;`, "Matching parenthesis #2", "(()())"],
  // Ambigiuous grammars
  [`S -> "a"* "a"*;`, "Highly ambigiuous #1", "aaa"],
  [`S -> "a"****;`, "Highly ambigiuous #2", "aa"],
  // TODO: I think this is a bug in the original paper, but this one works: S -> "a" | S S;
  [`S -> "a" | "" | S S;`, "Bug (infinite loop)", "aaa"],
  ["", "Grammar", `S -> ~"a"*;`],
];

export const LcrsGrammarPlayground = () => {
  const [example, setExample] = useState(0);
  const [str, setStr] = useState(examples[example][2]);
  const [grammar, setGrammar] = useState(examples[example][0]);
  const [expression, setExpression] = useState(() => parseGrammar(grammar));
  const [error, setError] = useState("");
  const changeGrammar = (g: string) => {
    setGrammar(g);
    try {
      setExpression(parseGrammar(g));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <>
      <div className={c.controls}>
        <label>
          <Nobr>Examples</Nobr>
          <br />
          <select
            onChange={(e) => {
              const exampleNumber = parseInt(e.target.value, 10);
              setExample(exampleNumber);
              setStr(examples[exampleNumber][2]);
              if (exampleNumber === examples.length - 1) {
                setGrammar("");
                setExpression(grammarExpression);
                setError("");
              } else {
                changeGrammar(examples[exampleNumber][0]);
              }
            }}
            value={example}
            className={c.select}
          >
            {examples.map(([value, label], i) => (
              <option value={i} key={i}>
                {label || value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Grammar
          <br />
          <textarea
            className={c.select}
            value={grammar}
            onChange={(e) => changeGrammar(e.target.value)}
            disabled={example === examples.length - 1}
          />
        </label>
        <label>
          String
          <br />
          <input
            className={c.select}
            value={str}
            onChange={(e) => setStr(e.target.value)}
          />
        </label>
        <label>
          Error
          <br />
          <div style={{ height: 36 }}>{error}</div>
        </label>
      </div>
      <VizualizeLcrsGrammar tree={expression} str={str} key={str + grammar} />
    </>
  );
};

export default LcrsGrammarPlayground;
