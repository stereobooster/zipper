// initially copied from https://github.com/DomParfitt/graphviz-react/blob/master/src/Graphviz.tsx

import { useEffect, useId } from "react";
// https://github.com/magjac/d3-graphviz
import { graphviz, GraphvizOptions } from "d3-graphviz";
import * as d3 from "d3-selection";

export type GraphvizProps = {
  /**
   * A string containing a graph representation using the Graphviz DOT language.
   * @see https://graphviz.org/doc/info/lang.html
   */
  dot: string;
  /**
   * Options to pass to the Graphviz renderer.
   */
  options?: GraphvizOptions;
  /**
   * The classname to attach to this component for styling purposes.
   */
  className?: string;
  onHover?: (key: number) => void;
};

const defaultOptions: GraphvizOptions = {
  fit: true,
  height: 500,
  width: 500,
  zoom: false,
};

/**
 * This is stupid - I could as well attach one listener at top level and catch all events
 * and based on target find parent with `.node` selector or add `pointer-events: none`
 */
function clickHandler(onHover: (key: number) => void) {
  return function () {
    // @ts-expect-error old school
    const node = d3.select(this);
    // @ts-expect-error I'm lazy
    onHover(node.data()[0]["key"]);
  };
}

export const Graphviz = ({
  dot,
  className,
  options,
  onHover,
}: GraphvizProps) => {
  const id = useId();

  useEffect(() => {
    const idSelector = `#${id.replaceAll(":", "\\:")}`;
    graphviz(
      idSelector,
      !options
        ? defaultOptions
        : {
            ...defaultOptions,
            ...options,
          }
    )
      .on("end", () => {
        const nodes = d3.selectAll(`${idSelector} .node`);
        nodes.selectAll("title").remove();
        if (onHover)
          nodes
            .on("mouseenter", clickHandler(onHover))
            .on("mouseleave", () => onHover(-1));
      })
      .renderDot(dot);

    return () => {
      if (onHover)
        d3.selectAll(`${idSelector} .node`)
          .on("mouseenter", null)
          .on("mouseleave", null);
    };
  }, [dot, options, onHover, id]);

  return <div className={className} id={id} />;
};
