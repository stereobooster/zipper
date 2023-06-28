import { CSSProperties } from "react";

export const controls: CSSProperties = {
  display: "flex",
  gap: 24,
  paddingLeft: 90,
  paddingBottom: 20,
  alignItems: "center",
};

export const subControls: CSSProperties = {
  display: "flex",
  gap: 24,
  alignItems: "center",
};

export const select: CSSProperties = {
  height: 36,
  fontSize: 24,
  textAlign: "center",
};
export const button: CSSProperties = {
  width: "min-content",
  height: 36,
  fontSize: 24,
  textAlign: "center",
};
export const buttonRect: CSSProperties = {
  ...button,
  width: 36,
};
export const text: CSSProperties = {
  height: 36,
  display: "flex",
  alignItems: "center",
};
export const input: CSSProperties = {
  width: 36,
  height: 36,
  fontSize: 24,
  textAlign: "center",
};

export const listColor = "#8b0000";
export const zipperColor = "#ff69b4";
export const leftColor = "#0000cd";
export const rightColor = "#006400";
export const grayColor = "#708090";
