import { openDB } from 'idb';

import { Crypto } from '../peer/crypto.js';
import { Identity, IdentityKey } from '../peer/identity.js';
import { Types } from './types.js';

import Timestamps from '../util/timestamps.js';

const _ATOMS    = 'atoms';
const _ACCOUNTS = 'accounts';

const _TYPE_IDX           = 'type';
const _TYPE_TIMESTAMP_IDX = 'type-timestamp';
const _TYPE_SAVED_IDX     = 'type-saved';

const _TAGS_IDX           = 'tags';
const _TAGS_TIMESTAMP_IDX = 'tags-timestamp';
const _TAGS_SAVED_IDX     = 'tags-saved';

const _MISSING_DEP_ERROR  = 'missing-dep-error';
const _CYCLIC_DEP_ERROR   = 'cyclic-dep-error';
const _FINGERPRINT_ERROR  = 'fingerprint-errpr';
const _SIGNATURE_ERROR    = 'signature-error';

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

  signAndSave(object, identities) {
    if (identities === undefined) {
      return this.save(object);
    } else {

      const sig_ops = [];
      identities.forEach(idfp => {
        sig_ops.push(this.load(idfp).then(id => {
          this.load(id.getIdentityKeyFingerprint())
              .then(key => object.sign(key));
        }));
      });

      return Promise.all(sig_ops).then(() => this.save(object));

    }
  }

  save(object) {

    let saveDeps = []

    Object.values(object.dependencies).forEach(dep => {
      saveDeps.append(this.save(dep));
    });

    Object.values(object.keys).forEach(key => {
      saveDeps.append(this.save(key));
    });

    return Promise.all(saveDeps).then(() => {

      var objectSave = null;

      if (object.isUnsaved()) {

        // mark saved time, save, fire callbacks if any

        object.setSavedTimestamp(Timestamps.uniqueTimestamp());

        const literal = Store.toStorageFormat(object);
        return this.db.then( (db) => {
          const tx = db.transaction([_ATOMS], 'readwrite');
          tx.objectStore(_ATOMS).put(literal);
          return tx.done;
        }).then(() => {

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

          return true;
        });
      } else {
        // already saved, do nothing
        return Promise.resolve(true);
      }
    });
  }

  load(fingerprint, external) {
    if (external === undefined) {
      external = {};
    }
    return this.loadWithDependencies(fingerprint, new Set(), this.loadStorageLiteral(fingerprint), {}, {}, external);
  }

  loadIfExists(fingerprint) {
    return this.load(fingerprint).catch(e => {
      if (!Store.isMissingDepError(e)) {
        throw e;
      }
      return null;
    });
  }

  loadStorageLiteral(fingerprint) {
    return this.db.then(
      (db) =>
        (db.transaction([_ATOMS], 'readonly').objectStore(_ATOMS).get(fingerprint))
    );
  }

  loadWithDependencies(fingerprint, parents, objLoad, dependencyLoads, keyLoads, external) {

    parents.add(fingerprint);
    return objLoad.then(literal => {
       var serial = null;
       if (literal !== undefined) {
         serial = Store.toSerialization(literal);
       } else if (fingerprint in external) {
         serial = external[fingerprint];
       } else {
         let e = new Error("Attempting to load missing object. Fingerprint: " + fingerprint);
         e.details = {'reason': _MISSING_DEP_ERROR, 'fingerprint': fingerprint, 'parents': parents};
         throw e;
       }

       let keys = serial['keys'];
       let keysToLoad = [];
       keys.forEach(keyfp => {
         if (parents.has(keyfp)) {
           let e = new Error("Cycle detected in object. Offending fingerprint is a key: " + keyfp);
           e.details = {'reason': _CYCLIC_DEP_ERROR, 'fingerprint': fingerprint, 'parents': parents};
           throw e;
         }
         if (!(keyfp in keyLoads)) {
           keyLoads[keyfp] =
            this.loadWithDependencies(keyfp, new Set(parents), this.loadStorageLiteral(keyfp), dependencyLoads, keyLoads, external)
                .catch(e => {
                  if (!Store.isMissingDepError(e)) {
                    throw e;
                  }
                  return null;
                });
            keysToLoad.append(keyLoads[keyfp]);
         }
       });

       let findKeys = Promise.all(keysToLoad).then(loadedKeys => {
         let foundKeys = {};
         loadedKeys.forEach(key => {
           if (key !== null) {
             foundKeys[key.fingerprint()] = key;
           }
         });
         return foundKeys;
       });

       let deps = serial['dependencies'];
       let toLoad = [];
       deps.forEach(depfp => {
         if (parents.has(depfp)) {
           let e = new Error("Cycle detected in object. Offending fingerprint: " + depfp);
           e.details = {'reason': _CYCLIC_DEP_ERROR, 'fingerprint': fingerprint, 'parents': parents};
           throw e;
         }
         if (!(depfp in dependencyLoads)) {
           dependencyLoads[depfp] = this.loadWithDependencies(depfp, new Set(parents), this.loadStorageLiteral(depfp), dependencyLoads, keyLoads, external);
         }
         toLoad.append(dependencyLoads[depfp]);
       });

      let findDeps = Promise.all(toLoad).then(loaded => {
        let currentDeps = {};
        loaded.forEach(obj => {
          currentDeps[obj.fingerprint()] = obj;
        });
        return currentDeps;
      });

      let result = Promise.all([findKeys, findDeps]).then(found => {
        let [foundKeys, foundDeps] = found;

        if (literal !== undefined) {
          return Store.fromStorageFormat(literal, foundDeps, foundKeys);
        } else {
          return Types.deserializeWithType(serial, foundDeps, foundKeys);
        };
      });


      /*
      let result = findKeys.then(foundKeys => {
        findDeps.then(foundDeps => {
          if (literal !== undefined) {
            return Store.fromStorageFormat(literal, foundDeps, foundKeys);
          } else {
            return Types.deserializeWithType(serial, foundDeps, foundKeys);
          };
        });
      });
      */

      if (literal !== undefined) {
        return result;
      } else {
        return result.then(object => this.checkExternalObject(fingerprint, object, parents, dependencyLoads, keyLoads, external));
      }

     });
  }

  // returns a promise that resolves to object if it is OK
  // or fails in case object is inconsistent or can't be
  // checked
  checkExternalObject(fingerprint, object, parents, deps, keys, external) {
    let computed = object.fingerprint();
    let expected = fingerprint;
    if (computed !== expected) {
      let e = new Error('Received object has a fingerprint mismatch (computed:' + computed + ', expected: ' + expected + ')');
      e.details = {'reason': _FINGERPRINT_ERROR, 'fingerprint': computed, 'expected': expected};
      return Promise.reject(e);
    }
    let sigChecks = [];
    object.getSignatories().forEach(
      (identityfp) => {
        sigChecks.append(
          this.loadWithDependencies(identityfp, new Set(parents), this.loadStorageLiteral(identityfp), deps, keys, external)
              .then(identity => {
                let signature = object.getSignature(identityfp);
                if (! identity instanceof Identity ||
                    ! identity.verify(fingerprint, signature)) {

                    let e = new Error('Received object ' + fingerprint + ' has invalid signature for identity ' + identityfp);
                    e.details = {'reason': _SIGNATURE_ERROR, 'fingerprint': fingerprint, 'identity': identityfp, 'signature': signature};
                    throw e;

                }
                return true;
              })
      );
    });

    return Promise.all(sigChecks).then(() => object);
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

      let deps = {};
      let keys = {};
      let external = {};
      let done = new Set();

      let cursor = await this.db.then((db) => db.transaction([_ATOMS], 'readonly').objectStore(_ATOMS).index(index).openCursor(range, direction));

      while (cursor) {

        let literal = cursor.value;
        let serial = Store.toSerialization(literal);
        deps[literal['fingerprint']] =

        result.push(this.loadWithDependencies(literal['fingerprint'], new Set(), Promise.resolved(literal), deps, keys, external));

        cursor = await cursor.continue();
      }

    }

    ingestCursor();

    return Promise.all(result);

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
            'saved'           : object.savedTimestamp,
            'type_timestamp'  : type_timestamp,
            'type_saved'      : type_saved,
            'tags_timestamp'  : tags_timestamp,
            'tags_saved'      : tags_saved,
          };
  }

  static toSerialization(literal) {
    return literal['serialization'];
  }

  static fromStorageFormat(literal, dependencies, foundKeys) {

    let object = Types.deserializeWithType(literal['serialization'], dependencies, foundKeys);
    object.setSavedTimestamp(literal['saved']);

    return object;
  }

  static literalFingerprint(literal) {
    return Crypto.fingerprintLiteral(literal);
  }

  static objectFingerprint(object) {
    return Store.literalFingerprint(object.serialize());
  }

  static isMissingDepError(error) {
    return 'details' in error && error.details['reason'] === _MISSING_DEP_ERROR;
  }

  static isStorableObject(something) {
    if (something !== null && typeof(something) === 'object' && 'isStorable' in something) {
      // TODO: check if isStorable is callable as well
      return something.isStorable()
    } else {
      return false;
    }
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
      this.tags             = new Set();
      this.dependencies     = {};
      this.signatures       = {};
      this.keys             = {};
      this.keyFingerprints  = new Set(); // if not present, a key will not be loadad
                                         // so we _need_ the fingerprints so the objects
                                         // will still have them in that case (for fingerprinting,
                                         // eventual retransmission to a host that does have
                                         // them, etc.)
      this.timestamp        = Timestamps.uniqueTimestamp();
      this.savedTimestamp   = null;
    }

    equals(storable) {
      return this.fingerprint() === storable.fingerprint();
    }

    // used to identify objects that implement this protocol
    isStorable() {
      return true;
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

      if (super.fingerprint === undefined) {
        return Store.objectFingerprint(this);
      } else {
        return super.fingerprint();
      }
    }

    tag(tag) {
      this.tags.add(tag);
    }

    untag(tag) {
      return this.tags.remove(tag);
    }

    setDependency(object) {
      this.dependencies[object.fingerprint()] = object;
    }

    removeDependency(object) {
      delete this.dependencies[object.fingerprint()];
    }

    addSignature(identityfp, signature) {
      this.signatures[identityfp] = signature;
    }

    removeSignature(identityfp) {
      delete this.signatures[identityfp]
    }

    signWith(identityKey) {
      this.addSignature(identityKey.identityFingerprint(), identityKey.sign(this.fingerprint()));
    }

    verifySignature(identity) {
      if (this.signatures[identity.fingerprint()] === undefined) {
        return false;
      } else {
        return identity.verify(this.fingerprint(), this.signatures[identity.fingerprint()]);
      }
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

    addDependency(obj) {
      this.dependencies[obj.fingerprint()] = obj;
    }

    getDependency(fingerprint) {
      return this.dependencies[fingerprint];
    }

    getDependencies() {
      return new Set(Object.values(this.dependencies));
    }

    getAllDependencies() {
      let all = new Set();
      this.collectAllDependencies(all);
      return all;
    }

    collectAllDependencies(all) {
      for (let dep of Object.values(this.dependencies)) {
        all.add(dep);
        dep.collectAllDependencies(all);
      }
    }

    getSignatories() {
      return new Set(Object.keys(this.signatures));
    }

    isSignedBy(identity) {
      return identity.fingerprint() in this.signatures;
    }

    getAllSignatories() {
      let all = new Set();
      this.collectAllSignatories(all);
      return all;
    }

    collectAllSignatories(all) {
      for (let fp of Object.keys(this.signatures)) {
        all.add(fp);
      }
      for (let dep of Object.values(this.dependencies)) {
        dep.collectAllSignatories(all);
      }
    }

    addKey(identityKey) {
      this.keyFingerprints.add(identityKey.fingerprint());
      this.keys[identityKey.fingerprint()] = identityKey;
    }

    getKey(fingerprint) {
      if (fingerprint in this.keys) {
        return this.keys[fingerprint];
      } else {
        return null;
      }
    }

    getKeyForIdentity(identity) {
      return this.getKey(identity.getIdentityKeyFingerprint());
    }

    // convenience
    isUnsaved() {
      return this.getSavedTimestamp() === null;
    }

    serialize() {
      var serial = super.serialize();
      serial['tags']         = Array.from(this.tags).sort();
      serial['dependencies'] = Object.keys(this.dependencies).sort();
      serial['keys']         = Array.from(this.keyFingerprints).sort();
      serial['timestamp']    = this.timestamp;
      serial['signatures']   = this.signatures;
      return serial;
    }

    deserialize(serial) {
      this.tags       = new Set(serial['tags']);
      this.keyFingerprints = new Set(serial['keys']);
      this.timestamp  = serial['timestamp'];
      this.signatures = serial['signatures'];
      super.deserialize(serial);
    }
  }
}

export {StorageManager, Account, storable};
