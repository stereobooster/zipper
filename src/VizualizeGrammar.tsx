import { useState } from "react";
import Graphviz from "graphviz-react";
import { Expression, treeToDot } from "./pwz";

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

export const VizualizeGrammar = ({
  tree,
  height,
  width,
}: VizualizeGrammarProps) => {
  const [layout, setLayout] = useState("dag");
  const dot = treeToDot({ tree, logical: layout === "dag" });

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
