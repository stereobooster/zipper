import { useState } from "react";
import { Tree } from "./Tree";
import Graphviz from "graphviz-react";
import {
  down,
  left,
  replace,
  right,
  treeToDot,
  treeToZipper,
  treeZipperToDot,
  up,
} from "./TreeZipper";

type VizualizeTreeZipperProps = {
  tree: Tree<string>;
  showZipper?: boolean;
  showTree?: boolean;
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
  width: 36,
  height: 36,
  fontSize: 24,
  textAlign: "center",
};

// still trying to figure best render engine
// so far chosed Graphviz, but there are other alternatives, like
// - https://js.cytoscape.org/
// - https://d3-graph-gallery.com/network.html
// - https://visjs.github.io/vis-network/examples/
// - https://github.com/vasturiano/react-force-graph
// - https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/ etc.
export const VizualizeTreeZipper = ({
  tree,
  showZipper,
  showTree,
  height,
  width,
}: VizualizeTreeZipperProps) => {
  const [layout, setLayout] = useState("dag");
  const [mode, setMode] = useState("zipper");
  const [zoom, setZoom] = useState(false);
  const [fit, setFit] = useState(false);
  const [zipper, setZipper] = useState(() => treeToZipper(tree));
  const dot = showZipper
    ? treeZipperToDot({
        zipper,
        tree: mode !== "zipper" ? tree : undefined,
        logical: layout === "dag",
      })
    : treeToDot({ tree, logical: layout === "dag" });
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
          <option value="dag">DAG</option>
          <option value="lcrs">LCRS tree</option>
        </select>
        {showZipper && (
          <>
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
            <input
              value={zipper.focus?.value}
              onChange={(e) =>
                setZipper((x) => replace(x, e.target.value as any))
              }
              style={button}
            />
            {showTree && (
              <select
                onChange={(e) => setMode(e.target.value)}
                value={mode}
                style={select}
              >
                <option value="zipper">Zipper</option>
                <option value="zipper-tree">Zipper + tree</option>
              </select>
            )}
            {false && (
              <label>
                <input
                  type="checkbox"
                  checked={zoom}
                  onChange={() => setZoom((x) => !x)}
                />{" "}
                Zoom
              </label>
            )}
            <label>
              <input
                type="checkbox"
                checked={fit}
                onChange={() => setFit((x) => !x)}
              />{" "}
              Fit
            </label>
          </>
        )}
      </div>
      <Graphviz
        dot={dot}
        // https://github.com/magjac/d3-graphviz#supported-options
        options={{
          height: height || 200,
          width: width || 500,
          engine: "dot",
          useWorker: false,
          fit,
          zoom,
        }}
      />
    </>
  );
};
