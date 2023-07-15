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
  DisplayItem,
  ID,
  LcrsZipper,
  NodesIndex,
  getLevel,
  lcrsExpressionZipperToDot,
  treeToZipper,
} from "./LcrsTree";
import { BaseButton, ButtonProps } from "./BaseButton";

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

const byOriginalId = (nodes: NodesIndex, id: ID) =>
  Object.values(nodes)
    .filter((x) => x.zipper.originalId === id)
    .map((x) => x.zipper.id);

type NodeButtonProps = ButtonProps & { node: LcrsZipper<ExpressionValue> };
const NodeButton = ({ node, ...rest }: NodeButtonProps) => (
  <BaseButton
    style={{
      textDecoration: "underline",
      cursor: rest.onClick ? "pointer" : "default",
    }}
    {...rest}
  >
    {node.value.label || node.value.expressionType}
  </BaseButton>
);

type LegendProps = {
  nodes: NodesIndex<ExpressionValue>;
  node: DisplayItem<ExpressionValue>;
  setSelectedNode: (id: ID) => void;
  setHighlightedNodes: (id: ID[]) => void;
  position: number;
};

const Legend = ({
  nodes,
  node,
  setSelectedNode,
  setHighlightedNodes,
  position,
}: LegendProps) => {
  const { originalId } = node.zipper;
  const { m } = node.zipper.value;
  const handlers = (id: ID) => ({
    onClick: () => {
      setSelectedNode(id);
      setHighlightedNodes([]);
    },
    onMouseEnter: () => setHighlightedNodes([id]),
    onMouseLeave: () => setHighlightedNodes([]),
  });

  return (
    <div style={legend}>
      label: {`${node.zipper.value.label}`} <br />
      value: {`${node.zipper.value.value}`} <br />
      type: {node.zipper.value.expressionType} <br />
      start: {node.zipper.value.start} <br />
      end: {node.zipper.value.end} <br />
      {node.zipper.left && (
        <>
          left:{" "}
          <NodeButton
            node={node.zipper.left}
            {...handlers(node.zipper.left.id)}
          />
          <br />
        </>
      )}
      {node.zipper.right && (
        <>
          right:{" "}
          <NodeButton
            node={node.zipper.right}
            {...handlers(node.zipper.right.id)}
          />
          <br />
        </>
      )}
      {node.zipper.up && (
        <>
          up:{" "}
          <NodeButton node={node.zipper.up} {...handlers(node.zipper.up.id)} />
          <br />
        </>
      )}
      {node.zipper.down && (
        <>
          down:{" "}
          <NodeButton
            node={node.zipper.down}
            {...handlers(node.zipper.down.id)}
          />
          <br />
        </>
      )}
      {originalId && nodes[originalId] ? (
        <>
          original:{" "}
          <NodeButton
            node={nodes[originalId].zipper}
            {...handlers(originalId)}
            onMouseEnter={() =>
              setHighlightedNodes([
                ...byOriginalId(nodes, originalId),
                originalId,
              ])
            }
          />
          <br />
        </>
      ) : (
        <>
          item:{" "}
          <NodeButton
            node={node.zipper}
            onMouseEnter={() =>
              setHighlightedNodes(byOriginalId(nodes, node.zipper.id))
            }
            onMouseLeave={() => setHighlightedNodes([])}
          />
          <br />
        </>
      )}
      {m && (
        <>
          m-parents:{" "}
          {m.parents.flatMap((x) => {
            if (!x.up) return [];
            return [
              <NodeButton key={x.up.id} node={x.up} {...handlers(x.up.id)} />,
              " ",
            ];
          })}
          <br />
          m-result:{" "}
          {(m.result[position] || []).flatMap((x) => [
            <NodeButton key={x.id} node={x} {...handlers(x.id)} />,
            " ",
          ])}
          <br />
        </>
      )}
    </div>
  );
};

export const VizualizeLcrsGrammar = ({
  tree,
  height,
  width,
  str,
}: VizualizeGrammarProps) => {
  const [fit, setFit] = useState(true);
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

  const { dot, index } = useMemo(
    () =>
      lcrsExpressionZipperToDot({
        zippers: steps[displayZipper]
          ? [steps[displayZipper][1]]
          : steps.map(([, zipper]) => zipper),
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
          <Legend
            node={nodes[selectedNode]}
            nodes={nodes}
            position={position}
            setSelectedNode={setSelectedNode}
            setHighlightedNodes={setHighlightedNodes}
          />
        )}
      </div>
    </>
  );
};
