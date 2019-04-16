import { openDB }from 'idb';
import { v4 as uuid } from 'uuid';

import { Crypto } from '../peer/crypto.js';
import { storable } from './storage.js';
import { Types } from './types.js';

import { SyncSet } from './collections/set.js';

class SyncLocationBase {
  constructor() {
    this.root = null;
    this.name = null;
    this.key  = null;
  }

  create(root, name, key) {
      this.root = root;
      this.name = name;
      this.key  = key;

      this.type = Types.SYNC_LOCATION();
  }

  serialize() {
    return {
      'root' : this.root,
      'name' : this.name,
      'key'  : this.key,
    };
  }

  deserialize(obj) {
    this.root = obj['root'];
    this.name = obj['name'];
    this.key  = obj['key'];
  }
}

const SyncLocation = storable(SyncLocationBase);

class SyncDirectiveBase {

  static ACTION_RECEIVE = 'receive';
  static ACTION_SEND    = 'send';

  constructor() {
    this.remoteIdentity = null;
    this.tags           = null;
    this.types          = null;
    this.action         = null;
  }

  createSendDirective(toWho, tags, types) {
    this.remoteIdentity = toWho;
    this.tags = new Set(tags);
    this.types = new Set(types);
    this.action = SyncDirective.ACTION_SEND;
  }

  createReceiveDirective(fromWho, tags, types) {
    this.remoteIdentity = fromWho;
    this.tags = new Set(tags);
    this.types = new Set(types);
    this.action = SyncDirective.ACTION_RECEIVE;
  }

  serialize() {
    return {
      'remote' : this.remoteIdentity,
      'tags'           : Array.from(this.tags),
      'types'          : Array.from(this.types),
      'action'         : this.action,
    };
  }

  deserialize(obj) {
    this.remoteIdentity = obj['remote'];
    this.tags           = new Set(obj['tags']);
    this.types          = new Set(obj['types']);
    this.action         = obj['action'];
  }
}

const SyncDirective = storable(SyncDirectiveBase);


class SyncService {

  static _LOCATIONS_TAG  = 'sync-locations-';
  static _DIRECTIVES_TAG = 'sync-directives-';

  constructor(identity, node, store) {
    this.identity = identity;
    this.node     = node;
    this.store    = store;

    this.location = null;

    this.locations  = null;
    this.directives = null;

    this.locationStatus = null;
  }

  openLocation(location) {
    this.syncdb = openDB('sync-' + location.fingerprint(), 1, (db) => {
      const deliveryStatusStore = db.createStore('delivery-status', {keypath: 'deliveryKey'});
      const locationStatusStore   = db.createStore('location-status', {keypath: 'fingerprint'});
    });

    this.location  = this.store.load(location);

    this.locations  = SyncService._loadSet(this.store, SyncService._LOCATIONS_TAG, location.root);
    this.directives = SyncService._loadSet(this.store, SyncService._DIRECTIVES_TAG, location.root);

    this.locationStatus = new Map();

    return Promise.all([this.syncdb, this.location, this.locations, this.directives]);
  }

  addDirective() {

  }

  removeDirective() {
    
  }

  static _loadSet(store, tag, root) {
    return store.loadByTag(tag + root, 0, 'desc', 1, false)
                .then(locSets => locSets[0]);
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



  createConfig(root) {
    const locations  = new SyncSet();
    locations.tag(SyncService._LOCATIONS_TAG + root);
    const directives = new SyncSet();
    directives.tag(SyncService._DIRECTIVES_TAG + root);

    const store = this.storageManager.getStore(root);

    const saves = [store.save(locations, [root]), store.save(directives, [root])];

    return Promise.all(saves);
  }

  createLocation(root, locationName) {
    const location = new SyncLocation();

    location.create(root, locationName);

    const store = this.storageManager.getStore(root);
    const account = this.identityManger.getRootIdentity(root);

    const saveLoc = store.save(location, [root]);
    const locSet  = SyncService._loadSet(store, SyncService._LOCATIONS_TAG, root);

    return Promise.all([saveLoc, locSet]).then(results => {
      const locSet = results[1];
      locSet.add(location.fingerprint());
      return locSet.flush(store, account);
    });
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

export { SyncLocation };
