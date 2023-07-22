// initially copied from https://github.com/DomParfitt/graphviz-react/blob/master/src/Graphviz.tsx

import { useEffect, useId, useMemo, useRef, useState } from "react";
// https://github.com/magjac/d3-graphviz
import { graphviz, GraphvizOptions } from "d3-graphviz";
import { Transition, transition } from "d3-transition";
import { easeLinear } from "d3-ease";
import { ID } from "../LcrsTree";
import "./Graphviz.css";

type Tr = Transition<any, any, any, any>;
export const transitionFactory = () =>
  transition("main").ease(easeLinear).delay(40).duration(300) as Tr;

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
  animate?: boolean;
};

const defaultOptions: GraphvizOptions = {
  fit: true,
  height: 500,
  width: 800,
  zoom: false,
  tweenPaths: false,
  tweenShapes: false,
};

export const Graphviz = ({
  dot,
  className,
  options,
  onHover,
  onClick,
  highlighted,
  animate,
}: GraphvizProps) => {
  const id = useId();
  const divRef = useRef<HTMLDivElement>(null);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    if (!highlighted || highlighted.length === 0) return;
    const nodes = highlighted.flatMap((x) => {
      const node =
        document.querySelector(`#${x} path`) ||
        document.querySelector(`#${x} polygon`);
      if (!node) return [];
      node.setAttribute("filter", "drop-shadow(0 0 2px black)");
      return [node];
    });
    return () => nodes.forEach((node) => node.setAttribute("filter", ""));
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
  }, [onClick, divRef]);

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

  // to prevent jumps on re-render
  const style = useMemo(
    () => ({
      width: options?.width || defaultOptions.width,
      height: options?.height || defaultOptions.height,
    }),
    [options]
  );

  useEffect(() => {
    const idSelector = `#${id.replaceAll(":", "\\:")}`;
    const result = graphviz(idSelector, {
      ...defaultOptions,
      ...(options || {}),
      ...style
    })
      .renderDot(dot)
      .on("end", () => setCounter((x) => x + 1));
    if (animate) {
      result.transition(transitionFactory);
      // @ts-expect-error destroy
      return () => result.destroy();
    }
  }, [dot, options, animate, style, id]);

  return <div className={className} id={id} ref={divRef} style={style} />;
};
