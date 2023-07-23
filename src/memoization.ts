// options:
// WeakMap based, Map based
// Loop detection - bottom value
// original (unmemoized version)
// one, n-arguments

const memoizePlaceholder = Symbol();
export const memoizeWeak = <K extends object | null, V, R extends Array<unknown>>(
  bottom: V,
  cb: (input: K, ...rest: R) => V
) => {
  const memo = new WeakMap<NonNullable<K>, V>();
  return (input: K, ...rest: R) => {
    if (input === null) return cb(input, ...rest);
    if (memo.has(input)) {
      const m = memo.get(input);
      return m === memoizePlaceholder ? bottom : (m as V);
    }
    memo.set(input, memoizePlaceholder as any);
    const result = cb(input, ...rest);
    memo.set(input, result);
    return result;
  };
};

const getChain = (obj: Record<any, any> | undefined, keys: any[]) => {
  if (!obj) return;
  let current = obj;
  for (const key of keys) {
    current = current[key];
    if (current === undefined) break;
  }
  return current;
};

const setChain = (
  obj: Record<any, any> | undefined,
  keys: any[],
  value: any
) => {
  if (!obj) obj = Object.create(null);
  let current = obj!;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      current[key] = value;
    } else {
      current[key] = current[key] || {};
      current = current[key];
    }
  }
  return obj!;
};

export function memoizeWeakChain<
  K extends object | null,
  V,
  R extends Array<unknown>
>(bottom: V, cb: (input: K, ...rest: R) => V): (input: K, ...rest: R) => V {
  const memo = new WeakMap<NonNullable<K>, Record<any, any>>();
  const fn = (input: K, ...rest: R) => {
    if (input === null) return cb(input, ...rest);
    const m = getChain(memo.get(input), rest) as V;
    if (m === memoizePlaceholder) return bottom;
    // if (m !== undefined) return m;
    memo.set(input, setChain(memo.get(input), rest, memoizePlaceholder));
    const result = cb(input, ...rest);
    memo.set(input, setChain(memo.get(input), rest, result));
    return result;
  };
  fn.original = cb;
  return fn;
}
