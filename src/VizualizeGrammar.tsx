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
// const input: React.CSSProperties = {
//   width: 36,
//   height: 36,
//   fontSize: 24,
//   textAlign: "center",
// };

const top = 1;

const dir = (direction: DeriveDirection): string => {
  switch (direction) {
    case "down":
      return "↓";
    case "downPrime":
      return "↓'";
    case "up":
      return "↑";
    case "upPrime":
      return "↑'";
    case "none":
      return "■";
  }
};

export const VizualizeGrammar = ({
  tree,
  height,
  width,
  str,
}: VizualizeGrammarProps) => {
  const [displayZipper, setDisplayZipper] = useState(-1);
  const [layout, setLayout] = useState("dag");

  const [position, setPosition] = useState(0);
  const token = str[position] || "";

  const [steps, setSteps] = useState(
    () => [["down", expressionToZipper(tree), undefined]] as Step[]
  );
  const [step, setStep] = useState(0);

  const [direction] = steps[step];
  const dot = expressionZipperToDot({
    zippers: !steps[displayZipper]
      ? steps.map(([, zipper]) => zipper)
      : [steps[displayZipper][1]],
    logical: layout === "dag",
    // tree,
  });

  const go = () => {
    let newSteps = deriveStep(position, token, steps, step);
    if (position >= str.length - 1) {
      newSteps = newSteps
        .filter(([, z, ,]) => z.focus.level >= top)
        .map(([d, z, ...rest]) =>
          d === "up" && z.focus.level === top && z.up === null
            ? ["none", z, ...rest]
            : [d, z, ...rest]
        );
    }
    setSteps(newSteps);

    let newStep = -1;
    if (newStep === -1)
      newStep = newSteps.findIndex(([direction]) => direction === "upPrime");
    if (newStep === -1)
      newStep = newSteps.findIndex(([direction]) => direction === "downPrime");
    if (newStep === -1)
      newStep = newSteps.findIndex(([direction]) => direction === "up");
    if (newStep === -1)
      newStep = newSteps.findIndex(([direction]) => direction === "down");

    if (newStep != -1) {
      const [newDirection] = newSteps[newStep];
      if (
        newDirection === "down" &&
        (direction === "up" || direction === "upPrime") &&
        position < str.length - 1
      ) {
        setPosition((x) => x + 1);
      }
      if (displayZipper != -1) setDisplayZipper(newStep);
      return setStep(newStep);
    }
    newStep = 0;
    if (displayZipper != -1) setDisplayZipper(newStep);
    setStep(newStep);
    setSteps(
      newSteps
        .filter(([, z, ,]) => z.focus.level >= top)
        .map(([_, z, ...rest]) =>
          position >= str.length - 1 && z.focus.level === top && z.up === null
            ? ["none", z, ...rest]
            : ["up", z, ...rest]
        )
    );
  };
  const [fit, setFit] = useState(false);
  const strWIthPos =
    str.substring(0, position) +
    `<b style="color:red">${token}</b>` +
    str.substring(position + 1, str.length);

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
        <select
          onChange={(e) => setDisplayZipper(parseInt(e.target.value, 10))}
          value={displayZipper}
          style={select}
        >
          <option value="-1">All</option>
          {steps.map((_, i) => (
            <option value={i} key={i}>
              {i}
            </option>
          ))}
        </select>
        <span dangerouslySetInnerHTML={{ __html: strWIthPos }} />
        <span
          dangerouslySetInnerHTML={{
            __html: steps
              .map(([d, z], i) =>
                i === step
                  ? `<b style="color:red">${dir(d)} ${z.focus.level}</b>`
                  : `${dir(d)} ${z.focus.level}`
              )
              .join(" | "),
          }}
        />
        <label>
          <input
            type="checkbox"
            checked={fit}
            onChange={() => setFit((x) => !x)}
          />{" "}
          Fit
        </label>
        {/*<input
          value={position}
          onChange={(e) => setPosition(parseInt(e.target.value, 10))}
          style={input}
          type="number"
        />
         <input
          value={step}
          onChange={(e) => setStep(parseInt(e.target.value, 10))}
          style={input}
          type="number"
        /> */}
      </div>
      <Graphviz
        dot={dot}
        options={{
          height: height || 600,
          width: width || 800,
          engine: "dot",
          useWorker: false,
          fit,
          zoom: false,
        }}
      />
    </>
  );
};
