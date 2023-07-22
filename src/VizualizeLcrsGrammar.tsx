import c from "./components/common.module.css";
import { Graphviz } from "./components/Graphviz";
import { Nobr } from "./components/Nobr";
import { BaseButton, ButtonProps } from "./components/BaseButton";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DeriveDirection,
  Expression,
  ExpressionValue,
  Step,
  deriveFinalSteps,
  processSteps,
  stepsToDot,
} from "./lcrsPwz";
import {
  DisplayItem,
  ID,
  LcrsZipper,
  NodesIndex,
  getLevel,
  treeToZipper,
} from "./LcrsTree";
import { GraphvizOptions } from "d3-graphviz";

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
    title={node.id}
    {...rest}
  >
    {node.loop
      ? node.down?.value.label || node.down?.value.expressionType
      : node.value.label || node.value.expressionType}
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
  node,
  setSelectedNode,
  setHighlightedNodes,
  position,
  nodes,
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
    <div className={c.legend}>
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
      {m && (
        <>
          m-parents:{" "}
          {m.parents.flatMap((x) => {
            if (!x.up) return [];
            return [
              <NodeButton
                key={x.up.id}
                node={x.up}
                {...handlers(x.up.id)}
                // onMouseEnter={() =>
                //   setHighlightedNodes(
                //     [x.up?.id, x.left?.id, x.right?.id].filter(Boolean) as any
                //   )
                // }
              />,
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
  const [animate, setAnimate] = useState(false);
  const [showMem, setShowMem] = useState(false);
  const [layout, setLayout] = useState("dag");

  const [displayZippers, setDisplayZippers] = useState([] as number[]);
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

  const [selectedNode, setSelectedNode] = useState<ID | undefined>();
  const { dot, index } = useMemo(() => {
    const displaySteps = displayZippers.map((x) => steps[x]).filter(Boolean);
    return stepsToDot({
      steps: displaySteps.length !== 0 ? displaySteps : steps,
      logical: layout === "dag",
      mem: showMem,
      position,
      token,
    });
  }, [layout, steps, displayZippers, showMem, position, token]);
  const nodes = index as NodesIndex<ExpressionValue>;
  const [cycle, setCycle] = useState(0);
  const [finished, setFinished] = useState(false);
  const go = useCallback(() => {
    if (position > str.length) return setFinished(true);
    setCycle((x) => x + 1);
    const [newSteps, newPosition, currentStep, currentStepLength, nextStep] =
      processSteps(token, position === str.length, position, steps);
    if (newSteps.length === 0) return setAutoDerivate(false);
    setPosition(newPosition);
    setStep(nextStep);
    setSteps(newSteps);
    if (displayZippers.length !== 0) {
      setDisplayZippers(
        displayZippers.flatMap((x) => {
          if (x < currentStep) return [x];
          if (x > currentStep) return [x + currentStepLength - 1];
          return Array.from({ length: currentStepLength }, (_, i) => i + x);
        })
      );
    }
    setSelectedNode((selectedNode) => {
      if (currentStepLength > 0 && selectedNode) {
        const z = newSteps[step][1];
        if (z.prevId === selectedNode) return z.id;
        if (z.up?.prevId === selectedNode) return z.up?.id;
        if (z.left?.prevId === selectedNode) return z.left?.id;
        if (z.right?.prevId === selectedNode) return z.right?.id;
        if (z.down?.prevId === selectedNode) return z.down?.id;
      }
      return selectedNode;
    });
    // if (currentStepLength === 1 && newSteps[nextStep][0] === "downPrime") {
    //   const [newSteps, newPosition, nextStep, newCycle] = deriveFinalSteps(
    //     str,
    //     tree,
    //     cycle + 2
    //   );
    //   setPosition(newPosition);
    //   setStep(nextStep);
    //   setSteps(newSteps);
    //   setCycle(newCycle);
    // }
  }, [
    step,
    position,
    token,
    steps,
    str,
    displayZippers,
    setFinished,
    setStep,
    setSteps,
    setCycle,
    setDisplayZippers,
    setSelectedNode,
  ]);

  const jumpToCycle = useCallback(() => {
    const [newSteps, newPosition, nextStep, newCycle] = deriveFinalSteps(
      str,
      tree,
      cycle
    );
    setFinished(false);
    setPosition(newPosition);
    setStep(nextStep);
    setSteps(newSteps);
    setCycle(newCycle);
    setAutoDerivate(false);
    setDisplayZippers([]);
  }, [cycle, str, tree, setFinished, setStep, setSteps, setDisplayZippers]);

  const [autoDerivate, setAutoDerivate] = useState(false);
  useEffect(() => {
    if (finished || !autoDerivate) return;
    const i = setInterval(go, 20);
    return () => clearInterval(i);
  }, [autoDerivate, finished, go]);

  const options: GraphvizOptions = useMemo(
    () => ({ height, width, fit }),
    [height, width, fit]
  );

  const [highlightedNodes, setHighlightedNodes] = useState<ID[]>([]);
  const highlighted = useMemo(() => {
    if (selectedNode) return [...new Set([selectedNode, ...highlightedNodes])];
    return highlightedNodes;
  }, [selectedNode, highlightedNodes]);

  return (
    <>
      <div className={c.controls}>
        <label>
          <Nobr>Show tree as</Nobr>
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
        <div>
          <br />
          <button
            className={c.buttonRect}
            onClick={go}
            disabled={finished || autoDerivate}
            onMouseEnter={() =>
              steps[step] && setHighlightedNodes([steps[step][1].id])
            }
            onMouseLeave={() => setHighlightedNodes([])}
          >
            {steps[step] ? dir(steps[step][0]) : "×"}
          </button>
        </div>
        <div>
          <br />
          <button
            className={c.buttonRect}
            onClick={() => setAutoDerivate((x) => !x)}
            disabled={finished}
          >
            ▶
          </button>
        </div>
        <label>
          Cycle
          <br />
          <input
            className={c.buttonRect}
            value={cycle}
            onChange={(e) => setCycle(parseInt(e.target.value, 10) || 0)}
          />
        </label>
        <div>
          <br />
          <button className={c.button} onClick={jumpToCycle}>
            Jump
          </button>
        </div>
        <div>
          <br />
          <label>
            <input
              type="checkbox"
              checked={showMem}
              onChange={() => setShowMem((x) => !x)}
            />{" "}
            Mem
          </label>
        </div>
        <div>
          <Nobr>String to parse</Nobr>
          <br />
          <div className={c.text}>
            <code
              className={c.code}
              dangerouslySetInnerHTML={{ __html: strWithPos }}
            />
          </div>
        </div>
        <div>
          <Nobr>Direction and depth</Nobr>
          <br />
          <div className={c.ToggleButtonContainer}>
            <BaseButton
              className={[
                c.ToggleButton,
                displayZippers.length === 0 ? c.selected : "",
              ].join(" ")}
              onClick={() => setDisplayZippers([])}
            >
              All
            </BaseButton>
            {steps.map(([d, z], i) => (
              <BaseButton
                className={[
                  c.ToggleButton,
                  displayZippers.includes(i) ? c.selected : "",
                  i === step ? c.next : "",
                ].join(" ")}
                key={i}
                onClick={() =>
                  setDisplayZippers(
                    displayZippers.includes(i)
                      ? displayZippers.filter((x) => x !== i)
                      : [...displayZippers, i].sort((a, b) => a - b)
                  )
                }
                onMouseEnter={() => setHighlightedNodes([z.id])}
                onMouseLeave={() => setHighlightedNodes([])}
              >
                {dir(d)} {getLevel(z)}
              </BaseButton>
            ))}
          </div>
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
          <label>
            <input
              type="checkbox"
              checked={animate}
              onChange={() => setAnimate((x) => !x)}
            />{" "}
            Animate
          </label>
        </div>
      </div>
      <div className={c.row}>
        <Graphviz
          dot={dot}
          onClick={setSelectedNode}
          options={options}
          highlighted={highlighted}
          animate={animate}
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
