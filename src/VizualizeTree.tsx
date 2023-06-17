import { useState } from "react";
import { NarryTree, narryTreeToTree } from "./Tree";
import Graphviz from "graphviz-react";
import { down, left, right, treeToDot, treeToZipper, up } from "./TreeZipper";

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
const button: React.CSSProperties = {
  width: 36,
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
        ["e", []],
        ["f", []],
      ],
    ],
    ["c", [["j", []]]],
    ["d", [["h", []]]],
  ],
];

const sampleTree = narryTreeToTree(sampleNarryTree);

// still trying to figure best render engine
// so far chosed Graphviz, but there are other alternatives, like
// - https://js.cytoscape.org/
// - https://d3-graph-gallery.com/network.html
// - https://visjs.github.io/vis-network/examples/
// - https://github.com/vasturiano/react-force-graph
// - https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/ etc.
export const VizualizeTree = () => {
  const [layout, setLayout] = useState("logical");
  const [tree] = useState(() => sampleTree);
  const [zipper, setZipper] = useState(() => treeToZipper(tree));
  const dot = treeToDot({ zipper, logical: layout === "logical" });
  const callback = (direction: "u" | "l" | "r" | "d") => () =>
    setZipper((zipper) => {
      switch (direction) {
        case "d":
          return down(zipper);
        case "l":
          return left(zipper);
        case "r":
          return right(zipper);
        case "u":
          return up(zipper);
      }
    });

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
        <button onClick={callback("l")} style={button}>
          ←
        </button>
        <button onClick={callback("r")} style={button}>
          →
        </button>
        <button onClick={callback("d")} style={button}>
          ↓
        </button>
        <button onClick={callback("u")} style={button}>
          ↑
        </button>
      </div>
      <Graphviz
        dot={dot}
        options={{ fit: false, height: 350, engine: "dot", useWorker: false }}
      />
    </>
  );
};
