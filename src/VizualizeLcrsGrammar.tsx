import c from "./components/common.module.css";
import { Graphviz } from "./components/Graphviz";
import { Nobr } from "./components/Nobr";
import { BaseButton } from "./components/BaseButton";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Expression,
  Step,
  deriveFinalSteps,
  processSteps,
  stepsToDot,
} from "./lcrsPwz";
import { ID, getLevel, treeToZipper } from "./LcrsTree";
import { GraphvizOptions } from "d3-graphviz";
import { VizualizeLcrsLegend, dir } from "./VizualizeLcrsLegend";

type VizualizeGrammarProps = {
  tree: Expression;
  str: string;
  height?: number;
  width?: number;
};

export const VizualizeLcrsGrammar = ({
  tree,
  height,
  width,
  str,
}: VizualizeGrammarProps) => {
  const [fit, setFit] = useState(true);
  const options: GraphvizOptions = useMemo(
    () => ({ height, width, fit }),
    [height, width, fit]
  );

  const [animate, setAnimate] = useState(false);
  const [showMem, setShowMem] = useState(false);
  const [layout, setLayout] = useState("dag");
  const [compact, setCompact] = useState(false);

  const [autoDerivate, setAutoDerivate] = useState(false);
  const [finished, setFinished] = useState(false);
  const [displayZippers, setDisplayZippers] = useState([] as number[]);
  const [selectedNode, setSelectedNode] = useState<ID | undefined>();
  const [highlightedNodes, setHighlightedNodes] = useState<ID[]>([]);

  const initialStep: Step[] = useMemo(
    () => [["down", treeToZipper(tree), undefined]],
    [tree]
  );
  const [cycle, setCycle] = useState(0);
  const [position, setPosition] = useState(0);
  const [step, setStep] = useState(0);
  const [steps, setSteps] = useState(initialStep);

  const token = str[position] || "";

  const { dot, index: nodes } = useMemo(() => {
    const displaySteps = displayZippers.map((x) => steps[x]).filter(Boolean);
    return stepsToDot({
      steps: displaySteps.length !== 0 ? displaySteps : steps,
      logical: layout === "dag",
      mem: showMem,
      position,
      token,
      compact,
    });
  }, [layout, steps, displayZippers, compact, showMem, position, token]);

  const go = useCallback(() => {
    if (position > str.length) {
      setFinished(true);
      setAutoDerivate(false);
      return;
    }
    const [newSteps, newPosition, currentStep, currentStepLength, nextStep] =
      processSteps(token, position === str.length, position, steps);
    if (newSteps.length === 0) {
      setFinished(true);
      setAutoDerivate(false);
      return;
    }
    setCycle((x) => x + 1);
    setPosition(newPosition);
    setStep(nextStep);
    setSteps(newSteps);
    setDisplayZippers((displayZippers) => {
      if (displayZippers.length !== 0) return displayZippers;
      return displayZippers.flatMap((x) => {
        if (x < currentStep) return [x];
        if (x > currentStep) return [x + currentStepLength - 1];
        return Array.from({ length: currentStepLength }, (_, i) => i + x);
      });
    });
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
  }, [
    step,
    position,
    token,
    steps,
    str,
    setFinished,
    setStep,
    setSteps,
    setCycle,
    setDisplayZippers,
    setSelectedNode,
  ]);

  const jumpToCycle = useCallback(() => {
    setFinished(false);
    setAutoDerivate(false);
    const [newSteps, newPosition, nextStep, newCycle] = deriveFinalSteps(
      str,
      initialStep,
      cycle
    );
    setCycle(newCycle);
    setPosition(newPosition);
    setStep(nextStep);
    setSteps(newSteps);
    setDisplayZippers([]);
  }, [
    cycle,
    str,
    initialStep,
    setFinished,
    setStep,
    setSteps,
    setDisplayZippers,
  ]);

  useEffect(() => {
    if (finished || !autoDerivate) return;
    const i = setInterval(go, 20);
    return () => clearInterval(i);
  }, [autoDerivate, finished, go]);

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
            className={c.inputRect}
            value={cycle}
            onChange={(e) => setCycle(parseInt(e.target.value, 10) || 0)}
            type="number"
            onBlur={jumpToCycle}
            onKeyDown={(e) => e.key === "Enter" && jumpToCycle()}
          />
        </label>
        <div>
          <Nobr>String to parse</Nobr>
          <br />
          <div className={c.text}>
            <code className={c.code}>
              {str.substring(0, position)}
              <span style={{ textDecoration: "underline" }}>{token}</span>
              {str.substring(position + 1, str.length)}
            </code>
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
              checked={showMem}
              onChange={() => setShowMem((x) => !x)}
            />{" "}
            Mem
          </label>
        </div>
        <div>
          <br />
          <label>
            <input
              type="checkbox"
              checked={compact}
              onChange={() => setCompact((x) => !x)}
            />{" "}
            Compact
          </label>
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
          <VizualizeLcrsLegend
            node={nodes[selectedNode]}
            nodes={nodes}
            position={position}
            setSelectedNode={setSelectedNode}
            setHighlightedNodes={setHighlightedNodes}
            steps={steps}
          />
        )}
      </div>
    </>
  );
};
