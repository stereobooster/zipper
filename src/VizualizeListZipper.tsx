import { ArcherContainer, ArcherElement } from "react-archer";
import {
  List,
  left,
  listToZipper,
  replace,
  right,
  zipperToDisplay,
} from "./List";
import { useState, Fragment } from "react";

const radius = 30;
const listColor = "#8b0000";
const shadowColor = "#708090";
const leftColor = "#0000cd";
const rightColor = "#006400";
const zipperColor = "#ff69b4";

const rowStyle = { display: "flex", padding: 10, paddingBottom: 0 };
const spacer = { width: radius };
const spacerZipper = { ...spacer, background: zipperColor };

const baseCell: React.CSSProperties = {
  textAlign: "center",
  lineHeight: `${radius}px`,
  width: radius,
  height: radius,
  borderRadius: "100%",
  overflow: "hidden",
  color: "white",
};
const nodeCell = { ...baseCell, background: listColor };
const leftZipperCell = { ...baseCell, background: leftColor };
const rightZipperCell = { ...baseCell, background: rightColor };
const shadowCell = { ...baseCell, background: shadowColor };
const blankCell = { ...baseCell, color: "black", background: "white" };

const blankWrapper = { padding: 6 };
const zipperMarker = { ...blankWrapper, background: zipperColor };
const zipperMarkerLeft = {
  ...zipperMarker,
  borderTopLeftRadius: "100%",
  borderBottomLeftRadius: "100%",
};
const zipperMarkerRight = {
  ...zipperMarker,
  borderTopRightRadius: "100%",
  borderBottomRightRadius: "100%",
};

const cellStyle = (type: string) => {
  if (type === "node") {
    return nodeCell;
  } else if (type === "leftZipper") {
    return leftZipperCell;
  } else if (type === "rightZipper") {
    return rightZipperCell;
  } else if (type === "shadow") {
    return shadowCell;
  } else {
    return blankCell;
  }
};

const wrapperStyle = (zipper: string | undefined) => {
  if (zipper == "left") {
    return zipperMarkerLeft;
  } else if (zipper == "focus") {
    return zipperMarker;
  } else if (zipper == "right") {
    return zipperMarkerRight;
  } else {
    return blankWrapper;
  }
};

const arrowStyle = (type: string | undefined) => {
  if (type === "shadow") {
    return { strokeColor: shadowColor };
  } else if (type === "leftZipper") {
    return { strokeColor: leftColor };
  } else if (type === "rightZipper") {
    return { strokeColor: rightColor };
  } else {
    return { strokeColor: listColor };
  }
};

export type VizualizeListZipperProps = {
  initialList: List<number>;
  showControls?: boolean;
  showZipper?: boolean;
  prefix: string;
};

const button: React.CSSProperties = {
  width: 36,
  height: 36,
  fontSize: 24,
  textAlign: "center",
};
const controls: React.CSSProperties = {
  display: "flex",
  gap: 24,
  paddingLeft: 90,
  alignItems: "center",
};

export const VizualizeListZipper = ({
  initialList,
  showControls,
  showZipper,
  prefix,
}: VizualizeListZipperProps) => {
  const [list] = useState(() => initialList);
  const [zipper, setZipper] = useState(() => listToZipper(initialList));
  const display = zipperToDisplay(list, showZipper ? zipper : undefined);
  const callback = (direction: number) => () =>
    setZipper((x) => (direction > 0 ? right(x) : left(x)));

  return (
    <div
      style={{
        minWidth: ((initialList?.length || 0) + 2) * 2 * (radius + 6),
        overflow: "scroll",
        paddingBottom: 10,
      }}
    >
      {showControls && (
        <div style={controls}>
          <button onClick={callback(-1)} style={button}>
            ←
          </button>
          <button onClick={callback(1)} style={button}>
            →
          </button>
          <input
            value={zipper.focus}
            onChange={(e) =>
              setZipper((x) => replace(x, e.target.value as any))
            }
            style={button}
          />
        </div>
      )}
      <ArcherContainer strokeColor="red">
        {display.map((row, i) => (
          <div style={rowStyle} key={i}>
            {row.map((cell, j) => (
              <Fragment key={cell.id}>
                <div style={wrapperStyle(cell.zipper)}>
                  <ArcherElement
                    id={prefix + cell.id}
                    relations={
                      cell.arrow
                        ? [
                            {
                              targetId: prefix + cell.arrow,
                              targetAnchor:
                                cell.type == "leftZipper" ? "right" : "left",
                              sourceAnchor:
                                cell.type == "leftZipper" ? "left" : "right",
                              style: arrowStyle(cell.type),
                            },
                          ]
                        : undefined
                    }
                  >
                    <div style={cellStyle(cell.type)}>{cell.value}</div>
                  </ArcherElement>
                </div>
                {j < (initialList?.length || 0) + 1 && (
                  <div
                    style={
                      cell.zipper === "left" || cell.zipper === "focus"
                        ? spacerZipper
                        : spacer
                    }
                  />
                )}
              </Fragment>
            ))}
          </div>
        ))}
      </ArcherContainer>
    </div>
  );
};
