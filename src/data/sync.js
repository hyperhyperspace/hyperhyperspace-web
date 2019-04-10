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

class StreamSetCheckpointBase {
  constructor() {
    this.admins = [];

  }
}

const StreamSetCheckpoint = storable(StreamSetCheckpointBase);

class SyncElementBase {

  constructor() {
    this.sructId      = null;
    this.predecessors = null;
    this.content      = null;
    this.meta         = null;
    this.type = Types.SYNC_ELEMENT();

  }

  serialize() {
    return {
      'structId'     : this.structId,
      'predecessors' : Array.from(this.predecessors).sort(),
      'content'      : (this.content === null ? '' : this.content),
      'meta'         :  this.meta,
      'type'         : this.type,
    };
  }

  deserialize(literal) {
    this.structId     = literal['sructId'];
    this.predecessors = new Set(literal['predecessors']);
    this.content      = (literal['content'] === '' ? null : literal['content']);
    this.meta         = literal['meta'];
    this.type         = literal['type'];
  }
}


const SyncElement = storable(SyncElementBase);

class SyncMetaBase {

  constructor() {
    this.protocol   = null;
    this.policies   = null;
    this.writers    = null;
    this.readers    = null;
  }

  init(protocol) {
    this.protocol   = protocol;
    this.policies   = new Set();
    this.writers    = new Set();
    this.readers    = new Set();
  }

  setProtocol(protocol) {
    this.protocol = protocol;
  }

  addPolicy(policy) {
    this.policies.add(policy);
  }

  removePolicy(policy) {
    this.policies.delete(policy);
  }

  addWriter(writer) {
    this.writers.add(writer);
  }

  removeWriter(writer) {
    this.writers.remove(writer);
  }

  addReader(reader) {
    this.readers.add(reader);
  }

  removeReader(reader) {
    this.readers.delete(reader);
  }

  serialize() {
    return {
      'protocol' : this.protocol,
      'policies' : Array.from(this.policies).sort(),
      'writers'  : Array.from(this.writers).sort(),
      'readers'  : Array.from(this.readers).sort(),
    }
  }

  deserialize(literal) {
    this.protocol   = literal['protocol'];
    this.policies   = new Set(literal['policy']);
    this.writers    = new Set(literal['writers']);
    this.readers    = new Set(literal['readers']);
  }
}

const SyncMeta = storable(SyncMetaBase);

class SyncStructBase {
  constructor(syncService) {
    this.synceService = syncService;
    this.meta = null;
  }

  create(protocol, policies, writers, readers) {

  }

  update(policies, writers, readers) {

  }

  getContent() {

  }

}

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

export { SyncLocation, SyncElement };
