import c from "./common.module.css";

export const Nobr = ({ children }: React.PropsWithChildren) => (
  <span className={c.Nobr}>{children}</span>
);
