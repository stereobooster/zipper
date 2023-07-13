// initially copied from https://github.com/DomParfitt/graphviz-react/blob/master/src/Graphviz.tsx

import { useEffect, useId, useRef, useState } from "react";
// https://github.com/magjac/d3-graphviz
import { graphviz, GraphvizOptions } from "d3-graphviz";
import * as d3 from "d3-selection";
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
  selected?: ID;
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
  selected,
}: GraphvizProps) => {
  const id = useId();
  const divRef = useRef<HTMLDivElement>(null);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    if (!selected) return;
    try {
      // wtf is wrong with this select. I could as well use https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector
      const nodes = d3.selectAll(`#${selected} path`);
      if (!nodes) return;
      const stroke = nodes.attr("stroke");
      const fill = nodes.attr("fill");
      nodes.attr("stroke", "#27ae60");
      nodes.attr("fill", "#27ae60");
      return () => {
        nodes.attr("stroke", stroke);
        nodes.attr("fill", fill);
      };
    } catch (e) {
      // do nothing
    }
  }, [selected, counter]);

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
