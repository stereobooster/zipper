import { useState } from "react";
import Graphviz from "graphviz-react";
import {
  DeriveDirection,
  Expression,
  Step,
  deriveStep,
  expressionToZipper,
  expressionZipperToDot,
} from "./pwz";

type VizualizeGrammarProps = {
  tree: Expression;
  str: string;
  height?: number;
  width?: number;
};

const controls: React.CSSProperties = {
  display: "flex",
  gap: 24,
  paddingLeft: 90,
  paddingBottom: 20,
  alignItems: "center",
};
const select: React.CSSProperties = {
  height: 36,
  fontSize: 24,
  textAlign: "center",
};
const button: React.CSSProperties = {
  width: "min-content",
  height: 36,
  fontSize: 24,
  textAlign: "center",
};

const dir = (direction: DeriveDirection) => {
  switch (direction) {
    case "down":
      return "↓";
    case "up":
      return "↑";
    case "none":
      return "-";
  }
};

export const VizualizeGrammar = ({
  tree,
  height,
  width,
  str,
}: VizualizeGrammarProps) => {
  const [position, setPosition] = useState(0);
  const token = str[position] || "";

  const [layout, setLayout] = useState("dag");
  const [steps, setSteps] = useState(
    () => [["down", expressionToZipper(tree)]] as Step[]
  );
  const [step, setStep] = useState(0);

  const [direction] = steps[step];
  const dot = expressionZipperToDot({
    zippers: steps.map(([, zipper]) => zipper),
    logical: layout === "dag",
    // tree,
  });

  const go = () => {
    if (
      steps.every(
        ([direction, zipper]) => zipper.up === null && direction === "up"
      )
    ) {
      console.log("sucessfully derived");
      return;
    }

    const newSteps = deriveStep(token, steps, step);
    setSteps(newSteps);
    const newStep = step < newSteps.length ? step : 0;
    setStep(newStep);

    if (newSteps.every(([direction]) => direction === "none")) {
      setPosition((x) => x + 1);
      setSteps(newSteps.map(([, zipper]) => ["up", zipper]));
      setStep(0);
    }

    const [newDirection] = newSteps[newStep];
    if (newDirection === "none" && newStep < newSteps.length - 1) {
      setStep(newStep + 1);
    }
  };
  const [fit, setFit] = useState(false);

  return (
    <>
      <div style={controls}>
        <select
          onChange={(e) => setLayout(e.target.value)}
          value={layout}
          style={select}
        >
          <option value="dag">DAG</option>
          <option value="lcrs">LCRS tree</option>
        </select>
        <button style={button} onClick={go}>
          Derivate
        </button>
        string: {str} | token: {token} ({position}) | direction:{" "}
        {dir(direction)}
        <label>
          <input
            type="checkbox"
            checked={fit}
            onChange={() => setFit((x) => !x)}
          />{" "}
          Fit
        </label>
      </div>
      <Graphviz
        dot={dot}
        options={{
          height: height || 600,
          width: width || 500,
          engine: "dot",
          useWorker: false,
          fit,
          zoom: false,
        }}
      />
    </>
  );
};
