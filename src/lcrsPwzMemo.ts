import { ID } from "./LcrsTree";

export class Memo<T = any> {
  map: Record<ID, Record<number, T>>;

  constructor() {
    this.map = Object.create(null);
  }

  get(expression: ID, position: number) {
    return (this.map[expression] || Object.create(null))[position];
  }

  set(expression: ID, position: number, value: T) {
    if (!this.map[expression]) this.map[expression] = Object.create(null);
    this.map[expression][position] = value;
  }

  reset() {
    this.map = Object.create(null);
  }
}
