import { openDB }from 'idb';
import { v4 as uuid } from 'uuid';

import { Crypto } from '../peer/crypto.js';
import { storable } from './storage.js';
import { Types } from './types.js';

const _LOCATIONS = 'locations';

const _SYNC_TAG = 'sync';

class SyncLocationBase {
  constructor() {
    this.identity = null;
    this.name     = null;
    this.key      = null;
  }

  create(identity, name, key) {
      this.identity = identity;
      this.name     = name;
      this.key      = key;

      this.type = Types.SYNC_LOCATION();
  }

  serialize() {
    return {
      'identity' : this.identity,
      'name'     : this.name,
      'key'      : this.key,
    };
  }

  deserialize(obj) {
    this.identity = obj['identity'];
    this.name     = obj['name'];
    this.key      = obj['key'];
  }
}

const SyncLocation = storable(SyncLocationBase);

class SyncDirective {

}


// set crdt
// single, immutable owner
// element removal supported through tombstones

class SyncSetBase {

  static _TAG_OP_PREFIX = 'sync-set-op-';

  static _generateTag(setId) {
    return SyncSet._TAG_OP_PREFIX + setId;
  }


  constructor(peer) {
    this.id       = null;
    this.owner    = null;

    this.contents = null;

    this.idToContents = null;
    this.contentToIds = null;

    this.removedIds   = null;

    this.pendingOps = null;

    this.version  = 1;
    this.type     = Types.SYNC_SET();
  }

  create(owner) {

    this.id    = uuid();
    this.owner = owner;

    this.contents     = new Set();

    this.idToContents = new Map();
    this.contentToIds = new Map();

    this.pendingOps = [];

    this.removedIds   = new Set();

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

  push(store, account) {

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

  subscribe(store) {

  }

  unsubscribe(store) {

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

    if (survivingIds.size > 0) {
      this.contents.add(element);
    } else {
      this.contents.delete(element);
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
    };
  }

  deseralize(obj) {
    this.set     = obj['set'];
    this.op      = obj['op'];
    this.element = obj['element'];
    this.ids     = new Set(obj['ids']);
  }
}

const SyncSetOp = storable(SyncSetOpBase);

class SyncService {

  constructor(identity, node, store) {
    this.identity = identity;
    this.node     = node;
    this.store    = store;

    this.syncdb = openDB('sync-' + identity.fingerprint(), 1, (db) => {
      const structStatusStore = db.createStore('struct-status', {keypath: 'structId'});
      const elementStatusStore = db.createStore('element-status', {keypath: 'fingerprint'});
      const syncConfigStore   = db.createStore('config', {keypath: 'fingerprint'});
    });
  }

  createStruct(flags, identities) {

  }

}

class SyncManager {
  constructor(identityManager, networkManager, storageManager) {
    this.identityManager = identityManager;
    this.networkManager  = networkManager;
    this.storageManager  = storageManager;

    this.services = new Map();
    /*this.directory = idb.open('location-directory', 1, (db) => {
      locationsStore = db.createObjectStore(_LOCATIONS, {keyPath: 'fingerprint'});
      locationsStore.createIndex("identity", "identity", {unique: true});
    });*/
  }

  createSyncLocation(identityKey, locationName) {
    const location = new SyncLocation();

    location.create(identityKey.fingerprint(), locationName);

    const store = this.storageManager.getStore(identityKey.fingerprint());
    return store.save(location, [identityKey]);
  }

  startSyncService(identity, location) {

  }

  stopSyncService(identity, location) {

  }
}

class Message {

  static create(type, sender, recipient, decryptKey, payload, signature) {
    var message = new Message();

    message.type = type;
    message.sender = sender;
    message.recipient = recipient;
    message.decryptKey = decryptKey;
    message.payload = payload;
    message.signature = signature;

    message.fingerprint = Crypto.fingerprintObject(message.serialize());

    return message;
  }

  constructor() {

    this.fingerprint = null;

    // control
    this.type   = null;

    // origin
    this.sender = null;

    // recipients
    this.recipient  = null; // fingerprint of the recipient root id key
    this.decryptKey = null; // finterprint of the key that was used to
                            // encrypt the contents, if they are encrypted
                            // (should be one of the recipient keys, could
                            // be the same as above)

    // message contents
    this.payload            = null;
    this.signature          = null; // this signature is not for the recipient,
                                    // but for other parties who may help deliver
                                    // the message (and therefore can't decrypt it
                                    // and use its contents to verify its authenticity)

  }

  serialize() {
    return {
      'fingerprint':  this.fingerprint,
      'type':         this.type,
      'sender':       this.sender,
      'recipient':    this.recipient,
      'decryptKey':   this.decryptKey,
      'payload':      this.payload,
      'signature':    this.signature,
    };
  }

  deserialize(obj) {
    this.fingerprint = obj['fingerprint'];
    this.type =        obj['type'];
    this.sender =      obj['sender'];
    this.recipient =   obj['recipient'];
    this.decryptKey =  obj['decryptKey'];
    this.payload =     obj['payload'];
    this.signature =   obj['signature'];
  }
}

export { SyncLocation, SyncSet, SyncSetOp };
