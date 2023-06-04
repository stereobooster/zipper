import { useState } from "react";
import { NarryTree, narryTreeToTree, treeToDot } from "./Tree";
import Graphviz from "graphviz-react";

// type VizualizeTreeProps = {};

const controls: React.CSSProperties = {
  display: "flex",
  gap: 24,
  paddingLeft: 90,
  alignItems: "center",
};
const select: React.CSSProperties = {
  height: 36,
  fontSize: 24,
  textAlign: "center",
};

const sampleNarryTree: NarryTree<string> = [
  "a",
  [
    [
      "b",
      [
        ["d", []],
        ["e", []],
      ],
    ],
    [
      "c",
      [
        ["f", []],
        ["j", [["k", []]]],
      ],
    ],
  ],
];

const sampleTree = narryTreeToTree(sampleNarryTree)

// still trying to figure best render engine
// so far chosed Graphviz, but there are other alternatives, like
// - https://js.cytoscape.org/
// - https://d3-graph-gallery.com/network.html
// - https://visjs.github.io/vis-network/examples/
// - https://github.com/vasturiano/react-force-graph
// - https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/ etc.
export const VizualizeTree = () => {
  const [layout, setLayout] = useState("logical");
  const dot = treeToDot(sampleTree, layout === "logical");
  return (
    <>
      <div style={controls}>
        <select
          onChange={(e) => setLayout(e.target.value)}
          value={layout}
          style={select}
        >
          <option value="logical">Logical</option>
          <option value="memory">Memory</option>
        </select>
      </div>
      <Graphviz dot={dot} options={{ fit: false, height: 350 }} />
    </>
  );
};
