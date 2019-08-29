import { v4 as uuid } from 'uuid';
import Counters from '../../util/counters.js';

/*

An operational mutable variable.

A CRDT primitive to have a replicated singleton set.

*/

class OperationalSingleton {
  constructor() {
    this.element = null;
    this.counter = null;

    this.callbacks = new Set();
  }

  addCallback(callback) {
    this.callbacks.add(callback);
  }

  removeCallback(callback) {
    this.callbacks.delete(callback);
  }

  createSetValueOp(element) {

    let nextCounter = this.counter == null ?
                        Counters.uniqueCounter() :
                        Counters.incrementUniqueCounter(this.counter);

    return {
      element: element,
      counter: nextCounter
    };
  }

  apply(op) {
    let element = op['element'];
    let counter = op['counter'];
    if (this.counter === null || 
        Counters.smaller(this.counter, counter)) {
      this.counter = counter;
      this.element = element;

      this.callbacks.forEach(f => f(this.element));
    }
  }

  getValue() {
    return this.element;
  }
}

export { OperationalSingleton };
