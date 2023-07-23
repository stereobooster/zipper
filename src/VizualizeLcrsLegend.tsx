import c from "./components/common.module.css";
import { DisplayItem, ID, LcrsZipper, NodesIndex, getLevel } from "./LcrsTree";
import { DeriveDirection, ExpressionValue, Step } from "./lcrsPwz";
import { BaseButton, ButtonProps } from "./components/BaseButton";

export const dir = (direction: DeriveDirection): string => {
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
  steps: Step[];
};

export const VizualizeLcrsLegend = ({
  node,
  setSelectedNode,
  setHighlightedNodes,
  position,
  nodes,
  steps,
}: LegendProps) => {
  const { originalId } = node.zipper;
  let { m } = node.zipper.value;
  const step = steps.find(([, z]) => node.zipper.id === z.id);
  if (step) {
    m = step[2];
  }
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
      {step && (
        <>
          Zipper next move: {dir(step[0])}
          <br />
          Level: {getLevel(step[1])}
          <br />
        </>
      )}
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
