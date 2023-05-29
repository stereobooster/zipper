export type List<T> = {
  value: T;
  next: List<T>;
  // just to simplify calculations, not a required part
  length: number;
} | null;

// prepend
export const cons = <T>(value: T, list: List<T>): List<T> => ({
  value,
  next: list,
  length: list ? list.length + 1 : 1,
});

// export const uncons = <T>(list: List<T>) => [head, tail]

export const map = <T, P>(list: List<T>, callback: (x: T) => P): List<P> => {
  if (list == null) return null;
  return cons(callback(list.value), map(list.next, callback));
};

export const arrayToList = <T>(a: T[]): List<T> => {
  if (a.length == 0) return null;
  const [first, ...rest] = a;
  return cons(first, arrayToList(rest));
};

export const listToNodes = <T>(list: List<T>): List<T>[] => {
  const result: List<T>[] = [];
  let current = list;
  while (current != null) {
    result.push(current);
    current = current.next;
  }
  return result;
};

export type ListZipper<T> = {
  left: List<T>;
  focus: T;
  right: List<T>;
};

export const listToZipper = <T>(list: List<T>): ListZipper<T> => {
  if (list === null) throw new Error("Can't construct Zipper from empty list");
  return {
    left: null,
    focus: list.value,
    right: list.next,
  };
};

export const right = <T>(zipper: ListZipper<T>): ListZipper<T> => {
  // other way would be to throw an Error
  if (zipper.right === null) return zipper;
  return {
    left: cons(zipper.focus, zipper.left),
    focus: zipper.right.value,
    right: zipper.right.next,
  };
};

export const left = <T>(zipper: ListZipper<T>): ListZipper<T> => {
  // other way would be to throw an Error
  if (zipper.left === null) return zipper;
  return {
    left: zipper.left.next,
    focus: zipper.left.value,
    right: cons(zipper.focus, zipper.right),
  };
};

export const replace = <T>(zipper: ListZipper<T>, value: T): ListZipper<T> => {
  return {
    left: zipper.left,
    focus: value,
    right: zipper.right,
  };
};

// TODO: [React Archer] Could not find target element! Not drawing the arrow.
// TODO: zipper without list display
// zipper operation: insertAfter, insertBefore
// 3 rows, blanks, items (color: grey, red, blue, green)

export type Cell = {
  id: string;
  type: "blank" | "node" | "shadow" | "leftZipper" | "rightZipper";
  zipper?: "left" | "right" | "focus";
  value?: string;
  arrow?: string;
};

export type Display = Cell[][];

const posToFocus = (
  focus: number,
  pos: number
): "left" | "right" | "focus" | undefined => {
  if (pos === focus - 1) {
    return "left";
  } else if (pos === focus) {
    return "focus";
  } else if (pos === focus + 1) {
    return "right";
  }
};

export const zipperToDisplay = <T>(list: List<T>, zipper?: ListZipper<T>) => {
  // list
  const firstRow: Cell[] = [];
  // zipper
  const secondRow: Cell[] = [];

  if (!zipper) {
    let i = 0;
    firstRow.push({ type: "blank", id: `0:${i}b` });
    map(list, (x) => {
      i++;
      firstRow.push({
        type: "node",
        id: `0:${i}`,
        arrow: `0:${i + 1}`,
        value: String(x),
      });
    });
    firstRow.push({ type: "blank", id: `0:${i + 1}b` });
    return [firstRow];
  }

  const length = list?.length || 0;
  const focus = (zipper.left?.length || 0) + 1;
  let i = 0;
  let maxFocus = length;

  // first and last blank cells
  firstRow[0] = { type: "blank", id: `0:0b` };
  firstRow[length + 1] = { type: "blank", id: `0:${length + 1}b` };
  secondRow[0] = {
    type: "blank",
    id: `1:0b`,
    zipper: posToFocus(focus, 0),
  };
  secondRow[length + 1] = {
    type: "blank",
    id: `1:${length + 1}b`,
    zipper: posToFocus(focus, length + 1),
  };

  // next
  i = focus;
  const nodes = listToNodes(list);
  const next = listToNodes(zipper.right);
  next.map((x) => {
    i++;
    if (nodes[i - 1] === x) maxFocus = Math.min(maxFocus, i - 1);
    if (i <= maxFocus) {
      secondRow[i] = {
        type: "rightZipper",
        id: `1:${i}`,
        arrow: `1:${i + 1}`,
        value: String(x?.value),
        zipper: posToFocus(focus, i),
      };
      firstRow[i] = {
        type: "shadow",
        id: `0:${i}`,
        value: String(nodes[i - 1]?.value),
        arrow: `0:${i + 1}`,
      };
    } else {
      secondRow[i] = {
        type: "blank",
        id: `1:${i}b`,
        zipper: posToFocus(focus, i),
      };
      firstRow[i] = {
        type: "node",
        id: `0:${i}`,
        arrow: nodes[i - 1]?.next ? `0:${i + 1}` : undefined,
        value: String(nodes[i - 1]?.value),
      };
    }
  });

  // focus
  secondRow[focus] = {
    type: "blank",
    zipper: posToFocus(focus, focus),
    id: `1:${focus}`,
    value: String(zipper.focus),
  };
  firstRow[focus] = {
    type: "shadow",
    arrow: `0:${focus + 1}`,
    id: `0:${focus}`,
    value: String(nodes[focus - 1]?.value),
  };

  // maxFocus
  if (maxFocus === focus) {
    firstRow[focus] = {
      ...firstRow[focus],
      type: "shadow",
      arrow: `1:${focus + 1}`,
    };
    if (maxFocus < length) {
      firstRow[maxFocus + 1] = {
        type: "blank",
        id: `0:${maxFocus + 1}`,
      };
      secondRow[maxFocus + 1] = {
        zipper: posToFocus(focus, maxFocus + 1),
        type: "node",
        arrow: `0:${maxFocus + 2}`,
        value: String(nodes[maxFocus]?.value),
        id: `1:${maxFocus + 1}`,
      };
    }
  } else {
    secondRow[maxFocus] = {
      ...secondRow[maxFocus],
      arrow: `0:${maxFocus + 1}`,
    };
  }

  // prev
  i = focus;
  map(zipper.left, (x) => {
    i--;
    secondRow[i] = {
      type: "leftZipper",
      id: `1:${i}`,
      arrow: `1:${i - 1}`,
      value: String(x),
      zipper: posToFocus(focus, i),
    };
    firstRow[i] = {
      type: "shadow",
      id: `0:${i}`,
      arrow: nodes[i - 1]?.next ? `0:${i + 1}` : undefined,
      value: String(nodes[i - 1]?.value),
    };
  });

  return [firstRow, secondRow];
};
