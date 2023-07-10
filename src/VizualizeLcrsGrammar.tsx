import { useCallback, useEffect, useMemo, useState } from "react";
import { Graphviz } from "./Graphviz";
import {
  DeriveDirection,
  Expression,
  Step,
  deriveFinalSteps,
  processSteps,
} from "./lcrsPwz";
import {
  Nobr,
  button,
  buttonRect,
  code,
  controls,
  // legend,
  row,
  select,
  text,
} from "./common";
import { getLevel, lcrsZipperToDot, treeToZipper } from "./LcrsTree";

type VizualizeGrammarProps = {
  tree: Expression;
  str: string;
  height?: number;
  width?: number;
};

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

export const VizualizeLcrsGrammar = ({
  tree,
  height,
  width,
  str,
}: VizualizeGrammarProps) => {
  const [fit, setFit] = useState(false);
  const [layout, setLayout] = useState("dag");

  const [displayZipper, setDisplayZipper] = useState(-1);
  const [step, setStep] = useState(0);
  const [steps, setSteps] = useState<Step[]>(() => [
    ["down", treeToZipper(tree), undefined],
  ]);

  const [position, setPosition] = useState(0);
  const token = str[position] || "";

  const strWithPos =
    str.substring(0, position) +
    `<span style="text-decoration: underline;">${token}</span>` +
    str.substring(position + 1, str.length);
  const depthAndDirection = steps
    .map(
      ([d, z], i) =>
        `<span style="white-space:nowrap;${
          i === step ? "text-decoration: underline;" : ""
        }${i === displayZipper ? "color: red;" : ""}">${dir(d)} ${getLevel(
          z
        )} </span>`
    )
    .join("&nbsp;,&nbsp;");

  const dot = useMemo(
    () =>
      lcrsZipperToDot({
        // zipper: !steps[displayZipper]
        //   ? steps.map(([, zipper]) => zipper)
        //   : [steps[displayZipper][1]],
        zipper: steps[0][1],
        logical: layout === "dag",
        // tree,
      }),
    [layout, steps, displayZipper]
  );

  const [finished, setFinished] = useState(false);
  const go = useCallback(() => {
    if (position > str.length) return setFinished(true);
    const [newSteps, newPosition, newStep] = processSteps(
      token,
      position === str.length,
      position,
      steps
    );
    setPosition(newPosition);
    setStep(newStep);
    setSteps(newSteps);
    if (displayZipper != -1) setDisplayZipper(newStep);
  }, [
    position,
    token,
    steps,
    displayZipper,
    str,
    setFinished,
    setDisplayZipper,
    setStep,
    setSteps,
  ]);

  const goFinish = useCallback(() => {
    const [newSteps, newPosition, newStep] = deriveFinalSteps(str, tree);
    setFinished(true);
    setPosition(newPosition);
    setStep(newStep);
    setSteps(newSteps);
    if (displayZipper != -1) setDisplayZipper(newStep);
  }, [
    str,
    tree,
    displayZipper,
    setFinished,
    setDisplayZipper,
    setStep,
    setSteps,
  ]);

  const [autoDerivate, setAutoDerivate] = useState(false);
  useEffect(() => {
    if (finished || !autoDerivate) return;
    const i = setInterval(go, 20);
    return () => clearInterval(i);
  }, [autoDerivate, finished, go]);

  const options = useMemo(
    () =>
      ({
        height: height || 600,
        width: width || 800,
        engine: "dot",
        useWorker: false,
        fit,
      } as const),
    [height, width, fit]
  );
  const [selectedNode, setSelectedNode] = useState(0);
  return (
    <>
      <div style={controls}>
        <label>
          <Nobr>Show tree as</Nobr>
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
        <div>
          <Nobr>Next step</Nobr>
          <br />
          <button style={buttonRect} onClick={go} disabled={finished}>
            {steps[step] ? dir(steps[step][0]) : "×"}
          </button>
        </div>
        <label>
          <Nobr>Which zipper</Nobr>
          <br />
          <select
            onChange={(e) => setDisplayZipper(parseInt(e.target.value, 10))}
            value={displayZipper}
            style={select}
          >
            <option value="-1">All</option>
            {steps.map((_, i) => (
              <option value={i} key={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <div>
          <Nobr>String to parse</Nobr>
          <br />
          <div style={text}>
            <code
              style={code}
              dangerouslySetInnerHTML={{ __html: strWithPos }}
            />
          </div>
        </div>
        <div>
          <Nobr>Direction and depth</Nobr>
          <br />
          <div
            style={text}
            dangerouslySetInnerHTML={{ __html: depthAndDirection }}
          />
        </div>
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
        <div>
          <br />
          <button
            style={buttonRect}
            onClick={() => setAutoDerivate((x) => !x)}
            disabled={finished}
          >
            ▶
          </button>
        </div>
        <div>
          <br />
          <button style={button} onClick={goFinish} disabled={finished}>
            Derivate
          </button>
        </div>
      </div>
      <div style={row}>
        <Graphviz dot={dot} onHover={setSelectedNode} options={options} />
        {/* {nodes[selectedNode] && (
          <div style={legend}>
            id: {nodes[selectedNode].id}
            <br />
            label: {nodes[selectedNode].label}
            <br />
            type: {nodes[selectedNode].expressionType}
            <br />
            start: {nodes[selectedNode].start}
            <br />
            end: {nodes[selectedNode].end}
          </div>
        )} */}
      </div>
    </>
  );
};
