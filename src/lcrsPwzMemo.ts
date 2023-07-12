import { ID } from "./LcrsTree";

export class Memo<T = any> {
  map: Record<ID, Record<number, T>>;

  constructor() {
    this.map = {};
  }

  get(expression: ID, position: number) {
    return (this.map[expression] || {})[position];
  }

  set(expression: ID, position: number, value: T) {
    if (!this.map[expression]) this.map[expression] = {};
    this.map[expression][position] = value;
  }

  reset() {
    this.map = {};
  }
}
