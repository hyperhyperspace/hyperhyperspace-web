import { openDB } from 'idb';

import { Crypto } from '../peer/crypto.js';
import IdentityKey from '../peer/identity.js';
import { Types } from './types.js';

const _ATOMS    = 'atoms';
const _ACCOUNTS = 'accounts';

const _TYPE_IDX           = 'type';
const _TYPE_TIMESTAMP_IDX = 'type-timestamp';
const _TYPE_SAVED_IDX     = 'type-saved';

const _TAGS_IDX           = 'tags';
const _TAGS_TIMESTAMP_IDX = 'tags-timestamp';
const _TAGS_SAVED_IDX     = 'tags-saved';

class Account {
  constructor() {
    this.fingerprint  = null;
    this.info         = null;
  }

  fromIdentityKey(id) {
    this.info        = id.getInfo();
    this.fingerprint = id.fingerprint();
  }

  serialize() {
    return {'fingerprint' : this.fingerprint,
            'info'        : this.info,
           };
  }

  deserialize(obj) {
    this.fingerprint = obj['fingerprint'];
    this.info = obj['info'];
  }
}

class Store {
  constructor(fingerprint) {
    this.fingerprint = fingerprint;
    this.db = openDB('account-' + fingerprint, 1, {
        upgrade(newdb, oldVersion, newVersion, tx) {

          var atomStore = newdb.createObjectStore(_ATOMS, {keyPath: 'fingerprint'});

          atomStore.createIndex(_TYPE_IDX, "literal.type");
          atomStore.createIndex(_TYPE_TIMESTAMP_IDX, "type_timestamp");
          atomStore.createIndex(_TYPE_SAVED_IDX, "type_saved");

          atomStore.createIndex(_TAGS_IDX, "literal.tags", {multiEntry: true});
          atomStore.createIndex(_TAGS_TIMESTAMP_IDX, "tags_timestamp", {multiEntry: true});
          atomStore.createIndex(_TAGS_SAVED_IDX, "tags_saved", {multiEntry: true});

      }
    });

    this.tagCallbacks  = new Map();
    this.typeCallbacks = new Map();
  }

  save(object, keys) {
    if (keys === undefined) {
      return this.doSave(object);
    } else {

      const promises = [];
      keys.forEach(key => {
        if (typeof key === 'object' && key instanceof IdentityKey) {
          object.sign(key);
        } else if (typeof key === 'string') {
          promises.push(this.load(key).then(key => object.sign(key)));
        }
      });

      return Promise.all(promises).then(() => this.doSave());

    }
  }

  doSave(object) {

    object.setStore(this);
    object.setSavedTimestamp(Store.uniqueTimestamp());

    const literal = Store.toStorageFormat(object);

    return this.db.then( (db) => {
      const tx = db.transaction([_ATOMS], 'readwrite');
      tx.objectStore(_ATOMS).put(literal);
      return tx.complete;
    }).then((txresult) => {

      if (object.tags !== undefined &&
          object.tags instanceof Set) {
        object.tags.forEach(tag => {
          if (this.tagCallbacks.has(tag)) {
            this.tagCallbacks.get(tag).forEach( callback => {
              window.setTimeout(callback, 0, object);
            });
          }
        });
      }

      if (object.type !== undefined &&
          this.typeCallbacks.has(object.type)) {
        this.typeCallbacks.get(object.type).forEach( callback => {
          window.setTimeout(callback, 0, object);
        });
      }

      return txresult;
    });
  }

  load(fingerprint) {
    return this.db.then(
      (db) =>
        (db.transaction([_ATOMS], 'readonly').objectStore(_ATOMS).get(fingerprint)))
                         .then(
      (literal) => ( literal === undefined ? undefined : Store.fromStorageFormat(literal) )
    );

  }

  loadAllByType(type, order, useRecvTime) {
    const index = useRecvTime ? _TYPE_SAVED_IDX : _TYPE_TIMESTAMP_IDX;
    return this.loadByIndex(index, type, order);
  }

  loadAllByTag(tag, order, useRecvTime) {
    const index = useRecvTime ? _TAGS_SAVED_IDX : _TAGS_TIMESTAMP_IDX;
    return this.loadByIndex(index, tag, order);
  }

  loadByType(type, start, order, count, useRecvTime) {
    const index = useRecvTime ? _TYPE_SAVED_IDX : _TYPE_TIMESTAMP_IDX;
    return this.loadByIndex(index, type, order, start, count);
  }

  loadByTag(tag, start, order, count, useRecvTime) {
    const index = useRecvTime ? _TAGS_SAVED_IDX : _TAGS_TIMESTAMP_IDX;
    return this.loadByIndex(index, tag, order, start, count);
  }

  loadByIndex(index, value, order, start, count) {

    if (order === undefined) order = 'asc';
    if (start === undefined) start = null;

    var start_value
    var end_value;

    if (order === 'asc') {
      if (start === null) {
        start_value = value + '_';
      } else {
        start_value = value + '_' + start;
      }
      end_value = value + '_Z';
    } else {
      if (start === null) {
        start_value = value + '_Z';
      } else {
        start_value = value + '_' + start;
      }
      end_value = value + '_';
    }

    const range = IDBKeyRange.bound(start_value, end_value, true, true);
    const direction = order === 'asc' ? 'next' : 'prev';

    let result = [];

    let ingestCursor = async () => {
      let cursor = await this.db.then((db) => db.transaction([_ATOMS], 'readonly').objectStore(_ATOMS).index(index).openCursor(range, direction));

      while (cursor) {

        result.push(Store.fromStorageFormat(cursor.value));

        cursor = await cursor.continue();
      }

    }

    ingestCursor();

    return result;

  }

  registerTypeCallback(type, callback) {
    Store._registerCallback(this.typeCallbacks, type, callback);
  }

  registerTagCallback(tag, callback) {
    Store._registerCallback(this.tagCallbacks, tag, callback);
  }

  deregisterTypeCallback(type, callback) {
    Store._deregisterCallback(this.typeCallbacks, type, callback);
  }

  deregisterTagCallback(tag, callback) {
    Store._deregisterCallback(this.tagCallbacks, tag, callback);
  }

  static _registerCallback(map, key, callback) {
    if (map.has(key)) {
      let arr = map.get(key);
      if (arr.indexOf(callback) < 0) { arr.push(callback); }
    } else {
      map.set(key, [callback]);
    }
  }

  static _deregisterCallback(map, key, callback) {
    if (map.has(key)) {
      let arr = map.get(key);
      let i   = arr.indexOf(callback);
      if (i >= 0) {
        arr.splice(i, 1);
      }
    }
  }

  static toStorageFormat(object) {

    var signatures;

    if (object.signatures !== undefined &&
        object.signatures instanceof Set) {
      signatures = Array.from(object.signatures);
    } else {
      signatures = [];
    }

    var type_timestamp = object.timestamp;
    var type_saved     = object.savedTimestamp;
    var tags_timestamp = [];
    var tags_saved     = [];

    if (object.type !== undefined) {
      if (object.timestamp !== undefined) {
        type_timestamp = object.type + '_' + object.timestamp;
      }
      type_saved = object.type + '_' + object.savedTimestamp;
    }

    if (Array.isArray(object.tags)) {
      if (object.timestamp !== undefined) {
        tags_timestamp = object.tags.map(tag => tag + '_' + object.timestamp);
      }
      tags_saved = object.tags.map(tag => tag + '_' + object.savedTimestamp);
    }



    return {'fingerprint'     : object.fingerprint(),
            'serialization'   : object.serialize(),
            'signatures'      : signatures,
            'saved'           : object.savedTimestamp,
            'type_timestamp'  : type_timestamp,
            'type_saved'      : type_saved,
            'tags_timestamp'  : tags_timestamp,
            'tags_saved'      : tags_saved,
          };
  }

  static fromStorageFormat(literal) {

    const object      = Types.deserializeWithType(literal['serialization']);

    object.setSignatures(literal['signatures']);
    object.setSavedTimestamp(literal['saved']);

    object.setStore(this);

    return object;
  }

  static _pad = (xs, n) => {
    while (xs.length < n) {
      xs = '0' + xs;
    }

    return xs;
  }

  static currentTimestamp() {
    return 'T' + Store._pad(Date.now().toString(16), 11);
  }

  static uniqueTimestamp() {
    const random = Store._pad(Math.floor(Math.random()*0xFFFFFFFFFF).toString(16), 10);
    return Store.currentTimestamp() + random;
  }

  static parseUniqueTimestamp(unique) {
    return parseInt(unique.substring(1,12), 16);
  }

  static literalFingerprint(literal) {
    return Crypto.fingerprintLiteral(literal);
  }

  static objectFingerprint(object) {
    return Store.literalFingerprint(object.serialize());
  }


}

class StorageManager {
  constructor() {
    this.stores = new Map();
    this.directory = openDB('account-directory', 1, {
        upgrade(newdb, oldVersion, newVersion, tx) {
          newdb.createObjectStore(_ACCOUNTS, {keyPath: 'fingerprint'});
      }
    });
  }

  createStore(masterKey) {
    var account = new Account();

    account.fromIdentityKey(masterKey);

    return this.directory.then((db) => {
      const tx = db.transaction([_ACCOUNTS], 'readwrite');
      tx.objectStore(_ACCOUNTS).put(account.serialize());
      return tx.done.then(() => (account));
    });
  }

  getStore(fingerprint) {
    if (this.stores.has(fingerprint)) {
      return this.stores.get(fingerprint);
    } else {
      const store = new Store(fingerprint);
      this.stores.set(fingerprint, store);
      return store;
    }
  }

  getAccounts() {
    return this.directory.then((db) => (db.transaction([_ACCOUNTS], 'readonly').objectStore(_ACCOUNTS).getAll()))
                         .then((serializations) => {
                           var accounts = [];
                           serializations.forEach(
                             (serialization) => {
                               var account = new Account();
                               account.deserialize(serialization);
                               accounts.push(account);
                             }
                           );
                           return accounts;
                         });
  }


  getAccount(fingerprint) {
    return this.directory.then(
      (db) => (db.transaction([_ACCOUNTS], 'readonly').objectStore(_ACCOUNTS).get(fingerprint)))
                         .then(
      (serialization) =>
        {
          var account = new Account();
          account.deserialize(serialization);
          return account;
        }
    );
  }
}

function storable(Class) {
  return class extends Class {
    constructor(...args) {
      super(...args);
      this.store      = null;
      this.tags       = new Set();
      this.signatures = [];
      this.timestamp  = Store.uniqueTimestamp();
      this.savedTimestamp   = null;
    }

    setStore(store) {
      this.store = store;
    }

    getStore() {
      return this.store;
    }

    setTags(iter) {
      this.tags = new Set(iter);
    }

    getTags() {
      return this.tags;
    }

    setSignatures(signatures) {
      this.signatures = signatures;
    }

    getSignatures() {
      return this.signatures;
    }

    fingerprint() {
      return Store.objectFingerprint(this);
    }

    tag(tag) {
      this.tags.add(tag);
    }

    untag(tag) {
      return this.tags.remove(tag);
    }

    sign(key) {
      this.signatures.push(
        {
          'key': key.getFingerprint(),
          'signature': key.sign(this.fingerprint()),
        });
    }

    checkSignature(key) {

      var check = false;

      this.signatures.forEach( (pair) => {
        if (pair['key'] === key.getFingerprint() &&
            key.verify(this.fingerprint, pair['signature'])) {
          check = true;
        }
      });

      return check;
    }

    getTimestamp() {
      return this.timestamp;
    }

    getSavedTimestamp() {
      return this.savedTimestamp;
    }

    setSavedTimestamp(savedTimestamp) {
      this.savedTimestamp = savedTimestamp;
    }

    serialize() {
      var literal = super.serialize();
      literal['tags']      = Array.from(this.tags);
      literal['timestamp'] = this.timestamp;
      return literal;
    }

    deserialize(literal) {
      super.deserialize(literal);
      this.tags      = new Set(literal['tags']);
      this.timestamp = literal['timestamp'];
    }
  }
}

export {StorageManager, Account, storable};
