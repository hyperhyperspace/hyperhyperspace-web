import { v4 as uuid } from 'uuid';

/*

Operational Set.

Instead of having methods that directly mutate data,
methods create operation objects that can be applied
through a single "apply" method.

Used as building blocks for the CRDT that are shared
among h.h.s. users. This operations will eventually be
sent over the network.

*/

class OperationalSet {

  static getElementFromOp(op) {
    return op['element'];
  }

  static getActionFromOp(op) {
    return op['action'];
  }

  constructor() {
    this.contents = new Set();

    this.elementToIds = new Map();
    this.removedIds = new Set();

    this.callbacks = new Set();
  }

  addCallback(callback) {
    this.callbacks.add(callback);
  }

  removeCallback(callback) {
    this.callbacks.delete(callback);
  }

  createAddOp(element) {
    return {
      action: 'add',
      element: element,
      ids: [uuid()],
    }
  }

  createRemoveOp(element) {

    const elementIds = this.elementToIds.get(element);
    const idsToRemove = elementIds === undefined ? new Set() : elementIds.filter(id => !this.removedIds.has(id));

    const result = idsToRemove.size === 0 ? null :
      {
        action: 'remove',
        element: element,
        ids: Array.from(idsToRemove).sort(),
      };

    return result;
  }

  apply(op) {
    let action  = op['action'];
    let element = op['element'];
    let ids     = op['ids'];

    var elementIds = this.elementToIds.get(element);
    if (elementIds === undefined) {
      elementIds = new Set();
      this.elementToIds.set(element, elementIds);
    }

    ids.forEach(id => {
      if (action === 'remove') {
        elementIds.add(id);
        if (action === 'remove') { this.removedIds.add(id); }
      }
    });

    const survivingIds = elementIds.filter(id => !this.removedIds.has(id));

    const addElement = (survivingIds > 0);

    const fireCallbacks = addElement !== this.contents.has(element);

    if (addElement) {
      this.contents.add(element);
    } else {
      this.contents.delete(element);
    }

    if (fireCallbacks) {
      this.callbacks.forEach(callback => callback(element, addElement));
    }

  }

  has(element) {
    return this.contents.has(element);
  }

  snapshot() {
    return new Set(this.contents);
  }
}

class OperationalIncrementalSet {
  constructor() {
    this.contents = new Set();
    this.callbacks = new Set();
  }

  addCallback(callback) {
    this.callbacks.add(callback);
  }

  removeCallback(callback) {
    this.callbacks.delete(callback);
  }

  createAddOp(element) {
    return {
      action: 'add',
      element: element,
    }
  }

  createRemoveOp(element) {
    throw new Error('Trying to remove an element from an incremental set.')
  }

  apply(op) {
    let action  = op['action'];
    let element = op['element'];

    const fireCallbacks = !this.contents.has(element);

    this.contents.add(element);

    if (fireCallbacks) {
      this.callbacks.forEach(callback => callback(element));
    }

  }

  has(element) {
    return this.contents.has(element);
  }

  getSnapshot() {
    return new Set(this.contents);
  }

}

// is this necessary??

class OperationalConfigurableSet {

  constructor(canAdd, canRemove, contents) {
    this.canAdd    = canAdd    === undefined? false : canAdd;
    this.canRemove = canRemove === undefined? false : canRemove;

    this.contents = new Set(contents === undefined? [] : contents);
  }

  addCallback(callback) {

  }

  removeCallback(callback) {

  }

  createAddOp(element) {

  }

  createRemoveOp(element) {

  }

  apply(op) {

  }
}

export { OperationalSet, OperationalIncrementalSet };
