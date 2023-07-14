import { useCallback, useEffect, useMemo, useState } from "react";
import { Graphviz } from "./Graphviz";
import {
  DeriveDirection,
  Expression,
  ExpressionValue,
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
  legend,
  row,
  select,
  text,
} from "./common";
import {
  ID,
  NodesIndex,
  getLevel,
  lcrsZipperToDot,
  treeToZipper,
} from "./LcrsTree";

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
  const [fit, setFit] = useState(true);
  const [layout, setLayout] = useState("dag");

  const [displayZipper, setDisplayZipper] = useState(0);
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

  const { dot, index } = useMemo(
    () =>
      lcrsZipperToDot({
        zipper: !steps[displayZipper]
          ? steps[0][1] //steps.map(([, zipper]) => zipper)
          : steps[displayZipper][1],
        logical: layout === "dag",
        // tree,
      }),
    [layout, steps, displayZipper]
  );
  const nodes = index as NodesIndex<ExpressionValue>;
  const [finished, setFinished] = useState(false);
  const go = useCallback(() => {
    if (position > str.length) return setFinished(true);
    const [newSteps, newPosition, newStep] = processSteps(
      token,
      position === str.length,
      position,
      steps
    );
    if (newSteps.length === 0) return setAutoDerivate(false);
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
  const [selectedNode, setSelectedNode] = useState<ID | undefined>();
  const [highlightedNodes, setHighlightedNodes] = useState<ID[]>([]);
  const highlighted = useMemo(() => {
    if (selectedNode) return [...new Set([selectedNode, ...highlightedNodes])];
    return highlightedNodes;
  }, [selectedNode, highlightedNodes]);

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
        <Graphviz
          dot={dot}
          onClick={setSelectedNode}
          options={options}
          highlighted={highlighted}
        />
        {selectedNode && nodes[selectedNode] && (
          <div style={legend}>
            label: {nodes[selectedNode].zipper.value.label} <br />
            value: {nodes[selectedNode].zipper.value.value} <br />
            type: {nodes[selectedNode].zipper.value.expressionType} <br />
            start: {nodes[selectedNode].zipper.value.start} <br />
            end: {nodes[selectedNode].zipper.value.end} <br />
            {nodes[selectedNode].zipper.originalId ? (
              <>
                originalId:{" "}
                <span
                  style={{ textDecoration: "underline", cursor: "pointer" }}
                  onClick={() => {
                    setSelectedNode(nodes[selectedNode].zipper.originalId);
                    setHighlightedNodes([]);
                  }}
                  onMouseEnter={() =>
                    setHighlightedNodes([
                      ...Object.values(nodes)
                        .filter(
                          (x) =>
                            x.zipper.originalId ===
                            nodes[selectedNode].zipper.originalId
                        )
                        .map((x) => x.zipper.id),
                      nodes[selectedNode].zipper.originalId!,
                    ])
                  }
                  onMouseLeave={() => setHighlightedNodes([])}
                >
                  {nodes[selectedNode].zipper.originalId}
                </span>
                <br />
              </>
            ) : (
              <>
                id:{" "}
                <span
                  style={{ textDecoration: "underline" }}
                  onMouseEnter={() =>
                    setHighlightedNodes([
                      ...Object.values(nodes)
                        .filter(
                          (x) =>
                            x.zipper.originalId ===
                            nodes[selectedNode].zipper.id
                        )
                        .map((x) => x.zipper.id),
                    ])
                  }
                  onMouseLeave={() => setHighlightedNodes([])}
                >
                  {nodes[selectedNode].zipper.id}
                </span>
                <br />
              </>
            )}
            {nodes[selectedNode].zipper.value.m && (
              <>
                m-parents:{" "}
                {nodes[selectedNode].zipper.value.m!.parents.map((x) =>
                  x.up ? (
                    <span
                      key={x.up.id}
                      style={{
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedNode(x.up!.id);
                        setHighlightedNodes([]);
                      }}
                      onMouseEnter={() => setHighlightedNodes([x.up!.id])}
                      onMouseLeave={() => setHighlightedNodes([])}
                    >
                      {x.up.id}
                    </span>
                  ) : (
                    ""
                  )
                )}
                <br />
                m-result:{" "}
                {(
                  nodes[selectedNode].zipper.value.m!.result[position] || []
                ).map((x) => (
                  <span
                    key={x.id}
                    style={{
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setSelectedNode(x.id);
                      setHighlightedNodes([]);
                    }}
                    onMouseEnter={() => setHighlightedNodes([x.id])}
                    onMouseLeave={() => setHighlightedNodes([])}
                  >
                    {x.id}
                  </span>
                ))}
                <br />
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};
