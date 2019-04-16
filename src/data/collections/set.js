import { v4 as uuid } from 'uuid';
import { Types } from '../types.js';
import { storable } from '../storage.js';


// set crdt
// single, immutable owner
// element removal supported through tombstones

class SyncSetBase {

  static _TAG_OP_PREFIX = 'sync-set-op-';

  static _generateTag(setId) {
    return SyncSet._TAG_OP_PREFIX + setId;
  }

  constructor() {
    this.id       = null;
    this.owner    = null;

    this.contents = null;

    this.idToContents = null;
    this.contentToIds = null;

    this.removedIds   = null;

    this.pendingOps = null;

    this.callbacks = null;

    this.opCallback= op => this._process(op);

    this.version  = 1;
    this.type     = Types.SYNC_SET();
  }

  create(owner) {

    this.id    = uuid();
    this.owner = owner;

    this._init();

  }

  _init() {
    this.contents     = new Set();

    this.idToContents = new Map();
    this.contentToIds = new Map();

    this.pendingOps = [];

    this.removedIds   = new Set();

    this.callbacks = new Set();
  }

  add(element) {
    const op = new SyncSetOp();
    op.makeAdd(this.id, element, new Set([uuid()]));

    this._process(op);
    this.pendingOps.push(op);
  }

  remove(element) {

    const elementIds = this.contentToIds.get(element);
    if (elementIds !== undefined) {
        const idsToRemove = elementIds.filter(id => ! this.removedIds.has(id));
        if (idsToRemove.size > 0) {
          const op = new SyncSetOp();
          op.makeRemove(this.id, element, idsToRemove);
          this._process(op);
          this.pendingOps.push(op);
        }
    }
  }

  has(element) {
    return this.contents.has(element);
  }

  snapshot() {
    return new Set(this.contents);
  }

  flush(store, account) {

    let promises = [];

    if (this.getSavedTimestamp() === null) {
      promises.push(account.sign(this).then(() => store.save(this)));
    }

    while (this.pendingOps.size > 0) {
      let op = this.pendingOps.shift();
      promises.push(account.sign(this).then(() => store.save(op)));
    }

    return Promise.all(promises);
  }

  pull(store, account) {
    return store.loadAllByTag(SyncSet._generateTag(this.id)).then( ops => {
      ops.forEach(op => {
        this._process(op);
      });
    });
  }

  sync(store, account) {
    this.flush();
    this.pull();
  }

  subscribe(store) {
    store.registerCallback(SyncSet._generateTag(this.id), this.opCallback);
  }

  unsubscribe(store) {
    store.deregisterCallback(SyncSet._generateTag(this.id), this.opCallback)
  }

  registerCallback(callback) {
    this.callbacks.add(callback);
  }

  deregisterCallback(callback) {
    this.callbacks.delete(callback);
  }

  _process(op) {

    let element = op.getElement();
    let elmtIds = this._getElementIds(element);

    op.getIds().forEach(id => {
      this.idToContents.set(id, element);
      elmtIds.add(id);
      if (op.isRemoval()) { this.removedIds.add(id); }
    });

    const survivingIds = elmtIds.filter(id => !this.removedIds.has(id));

    var fireCallbacks = false;

    if (survivingIds.size > 0) {
      if (!this.contents.has(element)) fireCallbacks = true;
      this.contents.add(element);
    } else {
      if (this.contents.has(element)) fireCallbacks = true;
      this.contents.delete(element);
    }

    if (fireCallbacks) {
      this.callbacks.forEach( callback => callback(element));
    }
  }

  _getElementIds(element) {
    var currentElmtIds = this.contentToIds.get(element);
    if (currentElmtIds === undefined) {
      currentElmtIds = new Set();
      this.contentToIds.set(element, currentElmtIds);
    }
    return currentElmtIds;
  }

  serialize() {
    return {
      'id'      : this.id,
      'owner'   : this.owner,
      'version' : this.version,
      'type'    : this.type,
    }
  }

  deserialize(obj) {
    this.id      = obj['id'];
    this.owner   = obj['owner'];
    this.version = obj['version'];
    this.type    = obj['type'];

    this._init();
  }

}

const SyncSet = storable(SyncSetBase);

class SyncSetOpBase {

  static _ADD    = 'add';
  static _REMOVE = 'remove';

  constructor() {
    this.set       = null;
    this.op        = null;
    this.element   = null;
    this.ids       = null;

    this.type = Types.SYNC_SET_OP();
  }

  makeAdd(set, element, ids) {
    this._operation(set, SyncSetOp._ADD, element, ids);
  }

  makeRemove(set, element, ids) {
    this._operation(set, SyncSetOp._REMOVE, element, ids);
  }

  isAddition() {
    return this.op === SyncSetOp._ADD;
  }

  isRemoval() {
    return this.op === SyncSetOp._REMOVE;
  }

  getElement() {
    return this.element;
  }

  getIds() {
    return this.ids;
  }

  _operation(set, op, element, ids) {

    this.set     = set;
    this.op      = op;
    this.element = element;
    this.ids     = ids;

    this.tag(SyncSet._generateTag(set));
  }

  serialize() {
    return {
      'set'     : this.set,
      'op'      : this.op,
      'element' : this.element,
      'ids'     : Array.from(this.ids),
      'type'    : this.type,
    };
  }

  deseralize(obj) {
    this.set     = obj['set'];
    this.op      = obj['op'];
    this.element = obj['element'];
    this.ids     = new Set(obj['ids']);
    this.type    = obj['type'];
  }
}

const SyncSetOp = storable(SyncSetOpBase);

export { SyncSet, SyncSetOp };
