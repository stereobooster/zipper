import { useState } from "react";
import Graphviz from "graphviz-react";
import {
  DeriveDirection,
  Expression,
  deriveStep,
  expressionToZipper,
  expressionZipperToDot,
} from "./pwz";

type VizualizeGrammarProps = {
  tree: Expression;
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
}: VizualizeGrammarProps) => {
  const str = "abcd";
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState<DeriveDirection>("down");
  const token = str[position] || "";

  const [layout, setLayout] = useState("dag");
  const [zipper, setZipper] = useState(() => expressionToZipper(tree));
  const dot = expressionZipperToDot({
    zipper,
    tree,
    logical: layout === "dag",
  });
  const go = () => {
    if (zipper.up === null && direction === "up") {
      console.log("sucessfully derived");
      return;
    }
    const [newZipper, newDirection] = deriveStep(token, zipper, direction);
    if (!newZipper) {
      console.log("failed to derivate");
      return;
    }
    setZipper(newZipper);
    if (newDirection == "none") {
      setPosition((x) => x + 1);
      setDirection("up");
    } else {
      setDirection(newDirection);
    }
  };

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
      </div>
      <Graphviz
        dot={dot}
        options={{
          height: height || 200,
          width: width || 500,
          engine: "dot",
          useWorker: false,
          fit: true,
          zoom: false,
        }}
      />
    </>
  );
};
