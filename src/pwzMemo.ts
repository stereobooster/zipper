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

// export class Memo<T = any> {
//   map: Record<ID, Record<number, T>>;

//   constructor() {
//     this.map = {};
//   }

//   get(expression: ID, position: number) {
//     // console.log(expression, position, this.map);
//     return (this.map[expression] || {})[position];
//   }

//   set(expression: ID, position: number, value: T) {
//     if (!this.map[expression]) this.map[expression] = {};
//     this.map[expression][position] = value;
//   }
// }
