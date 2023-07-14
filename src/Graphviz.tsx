// initially copied from https://github.com/DomParfitt/graphviz-react/blob/master/src/Graphviz.tsx

import { useEffect, useId, useRef, useState } from "react";
// https://github.com/magjac/d3-graphviz
import { graphviz, GraphvizOptions } from "d3-graphviz";
// import * as d3 from "d3-selection";
import { ID } from "./LcrsTree";
import "./Graphviz.css";

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
  onHover?: (key: ID | undefined) => void;
  onClick?: (key: ID | undefined) => void;
  // TODO: none property as array: [{ id, stroke, fill }]
  highlighted?: ID[];
};

const defaultOptions: GraphvizOptions = {
  fit: true,
  height: 500,
  width: 500,
  zoom: false,
};

export const Graphviz = ({
  dot,
  className,
  options,
  onHover,
  onClick,
  highlighted,
}: GraphvizProps) => {
  const id = useId();
  const divRef = useRef<HTMLDivElement>(null);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    if (!highlighted || highlighted.length === 0) return;
    const nodes = highlighted.flatMap((x) => {
      const node = document.querySelector(`#${x} path`);
      if (!node) return [];
      const stroke = node.getAttribute("stroke");
      const fill =  node.getAttribute("fill");
      node.setAttribute("stroke", "#27ae60");
      node.setAttribute("fill", "#27ae60");
      return [{ node, stroke, fill }];
    });
    return () => {
      nodes.forEach(({ node, stroke, fill }) => {
        node.setAttribute("stroke", stroke!);
        node.setAttribute("fill", fill!);
      });
    };
  }, [highlighted, counter]);

  useEffect(() => {
    const current = divRef.current;
    if (current && onClick) {
      const callback = (e: MouseEvent) => {
        const target = e.target as Element | null;
        if (!target?.closest) return;
        const node = target.closest(".node");
        onClick((node && node.getAttribute("id")) || undefined);
      };
      current.addEventListener("click", callback);
      return () => current.removeEventListener("click", callback);
    }
  }, [divRef, onClick]);

  useEffect(() => {
    const current = divRef.current;
    if (current && onHover) {
      const mouseover = (e: MouseEvent) => {
        const target = e.target as Element | null;
        if (!target?.closest) return;
        const node = target.closest(".node");
        onHover((node && node.getAttribute("id")) || undefined);
      };
      current.addEventListener("mouseover", mouseover);
      return () => current.removeEventListener("mouseover", mouseover);
    }
  }, [divRef, onHover]);

  useEffect(() => {
    const idSelector = `#${id.replaceAll(":", "\\:")}`;
    graphviz(idSelector, {
      ...defaultOptions,
      ...(options || {}),
    })
      .renderDot(dot)
      .on("end", () => setCounter((x) => x + 1));
  }, [dot, options, id]);

  return <div className={className} id={id} ref={divRef} />;
};
