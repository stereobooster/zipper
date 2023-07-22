import c from "./components/common.module.css";
import { Graphviz } from "./components/Graphviz";
import { useState } from "react";
import {
  LcrsTree,
  down,
  lcrsZipperToDot,
  left,
  right,
  treeToZipper,
  up,
  replace,
} from "./LcrsTree";

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
  const { dot } = lcrsZipperToDot({
    zippers: [zipper],
    logical: layout === "dag",
  });

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
                <button
                  onClick={callback("l")}
                  className={c.buttonRect}
                  disabled={zipper.left === null}
                >
                  ←
                </button>
                <button
                  onClick={callback("r")}
                  className={c.buttonRect}
                  disabled={zipper.right === null}
                >
                  →
                </button>
                <button
                  onClick={callback("d")}
                  className={c.buttonRect}
                  disabled={zipper.down === null}
                >
                  ↓
                </button>
                <button
                  onClick={callback("u")}
                  className={c.buttonRect}
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
                value={zipper.value as string}
                onChange={(e) =>
                  setZipper((x) => replace(x, e.target.value as any))
                }
                className={c.buttonRect}
              />
            </label>
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
