import { useState } from "react";
import { Nobr, controls, select } from "../common";
import { parseGrammar } from "./pwzGrammar";
import { VizualizeGrammar } from "./VizualizeGrammar";

// TODO: I think this is a bug in the original paper it can't handle S -> SS | "" | a

const examples = [
  [`S -> "" | "a" S;`, 'Kleene star as right recursion', 'aaa'],
  [`S -> "" | S "a";`, 'Kleene star as left recursion', 'aaa'],
  [`S -> "a"*;`, 'Kleene star', 'aaa'],
  [`S -> S "+" S | "0-9";`, 'Algebraic expression', '1+2+3'],
  [`S -> ("(" S ")")*;`, 'Matching parenthesis', '(()())'],
  [`S -> ("a"*) ("a"*);`, 'Highly ambigiuous', 'aaa'],
];

export const GrammarPlayground = () => {
  const [example, setExample] = useState(examples[0][0]);
  const [str, setStr] = useState(examples[0][2]);
  const [grammar, setGrammar] = useState(example);
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
      <div style={controls}>
        <label>
          <Nobr>Examples</Nobr>
          <br />
          <select
            onChange={(e) => {
              setExample(e.target.value);
              changeGrammar(e.target.value);
            }}
            value={example}
            style={select}
          >
            {examples.map(([value, label]) => (
              <option value={value} key={value}>
                {label || value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Grammar
          <br />
          <textarea
            style={select}
            value={grammar}
            onChange={(e) => changeGrammar(e.target.value)}
          />
        </label>
        <label>
          String
          <br />
          <input
            style={select}
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
      <VizualizeGrammar tree={expression} str={str} key={str + grammar} />
    </>
  );
};
