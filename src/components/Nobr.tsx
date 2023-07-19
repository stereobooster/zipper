import c from "./Nobr.module.css";

export const Nobr = ({ children }: React.PropsWithChildren) => (
  <span className={c.Nobr}>{children}</span>
);
