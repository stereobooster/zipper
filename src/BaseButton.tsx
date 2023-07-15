import c from "./BaseButton.module.css";

if (typeof document !== "undefined") {
  // https://alxgbsn.co.uk/2011/10/17/enable-css-active-pseudo-styles-in-mobile-safari/
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  document.addEventListener("touchstart", () => {}, false);
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
export const BaseButton = (props: ButtonProps) => (
  <button {...props} className={c.BaseButton} />
);

BaseButton.defaultProps = {
  type: "button",
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-autocomplete
  autocomplete: "off",
};
