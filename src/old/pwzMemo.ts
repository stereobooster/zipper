import { Expression } from "./pwz";

export class Memo<T = any> {
  map: WeakMap<Expression, Record<number, T>>;

  constructor() {
    this.map = new WeakMap();
  }

  get(expression: Expression, position: number) {
    return (this.map.get(expression) || {})[position];
  }

  set(expression: Expression, position: number, value: T) {
    this.map.set(expression, {
      ...(this.map.get(expression) || {}),
      [position]: value,
    });
  }

  reset() {
    this.map = new WeakMap();
  }
}
