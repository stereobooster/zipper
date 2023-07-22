import c from "./components/common.module.css";
import { useState } from "react";
import { Tree } from "./Tree";
import { Graphviz } from "./components/Graphviz";
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

export const VizualizeTreeZipper = ({
  tree,
  showZipper,
  showTree,
  height,
  width,
}: VizualizeTreeZipperProps) => {
  const [layout, setLayout] = useState("dag");
  const [mode, setMode] = useState("zipper");
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
      <div className={c.controls}>
        <label>
          Show tree as
          <br />
          <select
            onChange={(e) => setLayout(e.target.value)}
            value={layout}
            className={c.select}
          >
            <option value="dag">DAG</option>
            <option value="lcrs">LCRS tree</option>
          </select>
        </label>
        {showZipper && (
          <>
            <div>
              Use arrows to navigate
              <br />
              <div className={c.subControls}>
                <button onClick={callback("l")} className={c.buttonRect}>
                  ←
                </button>
                <button onClick={callback("r")} className={c.buttonRect}>
                  →
                </button>
                <button onClick={callback("d")} className={c.buttonRect}>
                  ↓
                </button>
                <button onClick={callback("u")} className={c.buttonRect}>
                  ↑
                </button>
              </div>
            </div>
            <label>
              Value at focus
              <br />
              <input
                value={zipper.focus?.value}
                onChange={(e) =>
                  setZipper((x) => replace(x, e.target.value as any))
                }
                className={c.buttonRect}
              />
            </label>
            {showTree && (
              <label>
                Zipper or tree?
                <br />
                <select
                  onChange={(e) => setMode(e.target.value)}
                  value={mode}
                  className={c.select}
                >
                  <option value="zipper">Zipper</option>
                  <option value="zipper-tree">Zipper + tree</option>
                </select>
              </label>
            )}
            <div>
              <br />
              <label>
                <input
                  type="checkbox"
                  checked={fit}
                  onChange={() => setFit((x) => !x)}
                />{" "}
                Fit
              </label>
            </div>
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
          zoom: false,
        }}
      />
    </>
  );
};

export default VizualizeTreeZipper;
