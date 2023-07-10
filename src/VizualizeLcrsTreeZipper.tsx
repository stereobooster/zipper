import { useState } from "react";
import { Graphviz } from "./Graphviz";
import {
  LcrsTree,
  down,
  lcrsZipperToDot,
  left,
  replace,
  right,
  treeToZipper,
  up,
} from "./LcrsTree";
import { buttonRect, controls, select, subControls } from "./common";

type VizualizeLcrsTreeZipperProps = {
  tree: LcrsTree<string>;
  showZipper?: boolean;
  showTree?: boolean;
  height?: number;
  width?: number;
};

export const VizualizeLcrsTreeZipper = ({
  tree,
  showZipper,
  showTree,
  height,
  width,
}: VizualizeLcrsTreeZipperProps) => {
  const [layout, setLayout] = useState("dag");
  const [mode, setMode] = useState("zipper");
  const [fit, setFit] = useState(false);
  const [zipper, setZipper] = useState(() => treeToZipper(tree));
  const dot = lcrsZipperToDot({ zipper, logical: layout === "dag" });

  const callback = (direction: "u" | "l" | "r" | "d") => () => {
    setZipper((zipper) => {
      try {
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
      } catch (e) {
        return zipper;
      }
    });
  };

  return (
    <>
      <div style={controls}>
        <label>
          Show tree as
          <br />
          <select
            onChange={(e) => setLayout(e.target.value)}
            value={layout}
            style={select}
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
              <div style={subControls}>
                <button
                  onClick={callback("l")}
                  style={buttonRect}
                  disabled={zipper.left === null}
                >
                  ←
                </button>
                <button
                  onClick={callback("r")}
                  style={buttonRect}
                  disabled={zipper.right === null}
                >
                  →
                </button>
                <button
                  onClick={callback("d")}
                  style={buttonRect}
                  disabled={zipper.down === null}
                >
                  ↓
                </button>
                <button
                  onClick={callback("u")}
                  style={buttonRect}
                  disabled={zipper.up === null}
                >
                  ↑
                </button>
              </div>
            </div>
            <label>
              Value at focus
              <br />
              <input
                value={zipper.value}
                onChange={(e) => setZipper((x) => replace(x, e.target.value))}
                style={buttonRect}
              />
            </label>
            {showTree && (
              <label>
                Zipper or tree?
                <br />
                <select
                  onChange={(e) => setMode(e.target.value)}
                  value={mode}
                  style={select}
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
