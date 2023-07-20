import c from "./components/common.module.css";
import { Nobr } from "./components/Nobr";
import { useState } from "react";
import { parseGrammar } from "./lcrsPwzGrammar";
import { VizualizeLcrsGrammar } from "./VizualizeLcrsGrammar";

const examples = [
  [`S -> S "+" S | S "-" S | "0-9";`, "Algebraic expression", "1+2-3+4"],
  [`S -> "" | "a" S;`, "Kleene star as right recursion", "aaa"],
  [`S -> "" | S "a";`, "Kleene star as left recursion", "aaa"],
  [`S -> "a"*;`, "Kleene star", "aaa"],
  [`S -> ("(" S ")")*;`, "Matching parenthesis", "(()())"],
  [`S -> "a"* "a"*;`, "Highly ambigiuous", "aaa"],
  // TODO: I think this is a bug in the original paper
  // but this one works: S -> "a" | S S;
  [`S -> "a" | "" | S S;`, "Bug (infinite loop)", "aaa"],
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
              changeGrammar(examples[exampleNumber][0]);
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
