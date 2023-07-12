import { useState } from "react";
import { Graphviz } from "./Graphviz";
import {
  LcrsTree,
  down,
  lcrsZipperToDot,
  left,
  right,
  treeToZipper,
  up,
} from "./LcrsTree";
import { buttonRect, controls, select, subControls } from "./common";

type VizualizeLcrsTreeZipperProps<T> = {
  tree: LcrsTree<T>;
  showZipper?: boolean;
  height?: number;
  width?: number;
};

export function VizualizeLcrsTreeZipper<T>({
  tree,
  showZipper,
  height,
  width,
}: VizualizeLcrsTreeZipperProps<T>) {
  const [layout, setLayout] = useState("dag");
  const [fit, setFit] = useState(false);
  const [zipper, setZipper] = useState(() => treeToZipper(tree));
  const { dot } = lcrsZipperToDot({ zipper, logical: layout === "dag" });

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
            {/* <label>
              Value at focus
              <br />
              <input
                value={zipper.value}
                onChange={(e) => setZipper((x) => replace(x, e.target.value))}
                style={buttonRect}
              />
            </label> */}
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
}
