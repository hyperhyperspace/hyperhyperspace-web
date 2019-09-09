import { openDB } from 'idb';

import { Crypto } from '../peer/crypto.js';
import { Identity } from '../peer/identity.js';
import { Types } from './types.js';

import { ReplicationService } from './replication.js';

import Timestamps from '../util/timestamps.js';

import Logger from '../util/logging';

const _OBJECTS   = 'objects';
const _INSTANCES = 'instances';

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

class Store {
  constructor(accountInstanceFP) {

    this.logger = new Logger(this);
    this.logger.setLevel(Logger.INFO());

    this.accountInstanceFP = accountInstanceFP;
    this.db = openDB('account-instance-' + accountInstanceFP, 1, {
        upgrade(newdb, oldVersion, newVersion, tx) {

          var atomStore = newdb.createObjectStore(_OBJECTS, {keyPath: 'fingerprint'});

          atomStore.createIndex(_TYPE_IDX, "serialization.type");
          atomStore.createIndex(_TYPE_TIMESTAMP_IDX, "type_timestamp");
          atomStore.createIndex(_TYPE_SAVED_IDX, "type_saved");

          atomStore.createIndex(_TAGS_IDX, "serialization.tags", {multiEntry: true});
          atomStore.createIndex(_TAGS_TIMESTAMP_IDX, "tags_timestamp", {multiEntry: true});
          atomStore.createIndex(_TAGS_SAVED_IDX, "tags_saved", {multiEntry: true});

      }
    });

    this.tagCallbacks  = new Map();
    this.typeCallbacks = new Map();
  }

  getAccountInstanceFP() {
    return this.accountInstanceFP;
  }

  save(object) {
    this.logger.debug('about to save ' + object.fingerprint());
    return this.saveOnce(object, {});
  }

  saveOnce(object, savePromises) {

    let saveDeps = []

    Object.values(object.dependencies).forEach(dep => {
      if (!(dep.fingerprint() in savePromises)) {
        savePromises[dep.fingerprint()] = this.saveOnce(dep, savePromises);
      }
      saveDeps.push(savePromises[dep.fingerprint()]);

    });

    Object.values(object.keys).forEach(key => {
      if (!(key.fingerprint() in savePromises)) {
        savePromises[key.fingerprint()] = this.saveOnce(key, savePromises);
      }
      saveDeps.push(savePromises[key.fingerprint()]);
    });

    return Promise.all(saveDeps).then(() => {

      if (object.isUnsaved()) {

        // mark saved time, save, fire callbacks if any

        object.setSavedTimestamp(Timestamps.uniqueTimestamp());

        const literal = Store.toStorageFormat(object);
        return this.db.then( (db) => {
          const tx = db.transaction([_OBJECTS], 'readwrite');
          tx.objectStore(_OBJECTS).put(literal);
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

    this.logger.debug('(' + this.accountInstanceFP + ') about to load ' + fingerprint + ' externals: ' + Object.keys(external).toString());

    return this.loadWithDependencies(fingerprint, new Set(), this.loadStorageLiteral(fingerprint), {}, {}, external)
                  .then(obj => {
                    this.logger.trace('(' + this.accountInstanceFP + ') done loading ' + fingerprint);
                    return obj;
                  });
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
        (db.transaction([_OBJECTS], 'readonly').objectStore(_OBJECTS).get(fingerprint))
    );
  }

  loadWithDependencies(fingerprint, parents, objLoad, dependencyLoads, keyLoads, external) {

    this.logger.trace('(' + this.accountInstanceFP + ') load w/deps ' + fingerprint);

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
            keysToLoad.push(keyLoads[keyfp]);
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
         toLoad.push(dependencyLoads[depfp]);
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
        }
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

      if (literal === undefined) {
        result = result.then(object => this.checkExternalObject(fingerprint, object, parents, dependencyLoads, keyLoads, external));
      }

      //result = result.then(object => this.autoPullDependencies(object));

      return result;


      /*
      if (literal !== undefined) {
        return result;
      } else {
        return result.then(object => this.checkExternalObject(fingerprint, object, parents, dependencyLoads, keyLoads, external));
      }*/

     });
  }

  // returns a promise that resolves to object if it is OK
  // or fails in case object is inconsistent or can't be
  // checked
  checkExternalObject(fingerprint, object, parents, deps, keys, external) {

    this.logger.trace('(' + this.accountInstanceFP + '): checking external ' + fingerprint);

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
        sigChecks.push(
          this.loadWithDependencies(identityfp, new Set(parents), this.loadStorageLiteral(identityfp), deps, keys, external)
              .then(identity => {
                let signature = object.getSignatures()[identityfp];
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

  autoPullDependencies(object) {
    let pulls = [];
    if (object.autoPullDependencies()) {
      object.getDependencies().forEach(
        dependency => {
          if (ReplicationService.isReplicable(dependency)) {
            pulls.push(dependency.pull(this));
          }
        }
      );
    }
    return Promise.all(pulls).then(() => object);
  }

  loadAllByType(type, order, useRecvTime) {
    this.logger.debug('(' + this.accountInstanceFP + ') about to load all by type ' + type); // + ' externals: ' + Object.keys(external).toString());
    const index = useRecvTime ? _TYPE_SAVED_IDX : _TYPE_TIMESTAMP_IDX;
    return this.loadByIndex(index, type, order);
  }

  loadAllByTag(tag, order, useRecvTime) {
    this.logger.debug('(' + this.accountInstanceFP + ') about to load all by tag ' + tag); // + ' externals: ' + Object.keys(external).toString());
    const index = useRecvTime ? _TAGS_SAVED_IDX : _TAGS_TIMESTAMP_IDX;
    return this.loadByIndex(index, tag, order);
  }

  loadByType(type, start, order, count, useRecvTime) {
    this.logger.debug('(' + this.accountInstanceFP + ') about to load by type ' + type); // + ' externals: ' + Object.keys(external).toString());
    const index = useRecvTime ? _TYPE_SAVED_IDX : _TYPE_TIMESTAMP_IDX;
    return this.loadByIndex(index, type, order, start, count);
  }

  loadByTag(tag, start, order, count, useRecvTime) {
    this.logger.debug('(' + this.accountInstanceFP + ') about to load by tag ' + tag); // + ' externals: ' + Object.keys(external).toString());
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



    let ingestCursor = async () => {

      let result = [];

      let deps = {};
      let keys = {};
      let external = {};

      var cursor = await this.db.then((db) => db.transaction([_OBJECTS], 'readonly').objectStore(_OBJECTS).index(index).openCursor(range, direction));

      while (cursor) {

        let literal = cursor.value;
        let loadPromise = this.loadWithDependencies(literal['fingerprint'], new Set(), Promise.resolve(literal), deps, keys, external);
        deps[literal['fingerprint']] = loadPromise;
        result.push(loadPromise);

        cursor = await cursor.continue();
      }

      return result;
    }

    return ingestCursor().then(result => Promise.all(result));
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

    if (object.timestamp !== undefined) {
      tags_timestamp = Array.from(object.tags).map(tag => tag + '_' + object.timestamp);
    }
    tags_saved = Array.from(object.tags).map(tag => tag + '_' + object.savedTimestamp);


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

  static objectFingerprint(object, extra) {

    let serial = object.serialize();

    if (extra !== undefined) {
      for (let prop in extra) {
        serial[prop] = extra[prop];
      }
    }

    if ('signatures' in serial) {
      serial['signatures'] = Object.keys(serial['signatures']).sort();
    }

    return Store.literalFingerprint(serial);
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

function storable(Class) {
  return class extends Class {
    constructor(...args) {
      super(...args);
      this.initializeStorable(); // this initalization must come _after_ calling super
                                  // b/c of how constructors work in javascript
    }

    // so we provide this initialization function, that will not re-initialize an already
    // initialized object, that super can explicitly call in its constructor in case it
    // needs the storable functionality to construct itself.

    initializeStorable(params) {

      if (params === undefined) {
        params = {}
      }

      if (this.timestamp === undefined) {
        this.tags             = new Set();
        this.dependencies     = {};
        this.signatures       = {};
        this.keys             = {};
        this.keyFingerprints  = new Set(); // if not present, a key will not be loadad
                                           // so we _need_ the fingerprints so the objects
                                           // will still have them in that case (for fingerprinting,
                                           // eventual retransmission to a host that does have
                                           // them, etc.)
        var noTimestamp = false;
        if ('noTimestamp' in params) {
          noTimestamp = params['noTimestamp'];
        }
        if (noTimestamp) {
          this.timestamp = Timestamps.epochTimestamp();
        } else {
          this.timestamp = Timestamps.uniqueTimestamp();
        }
        this.savedTimestamp   = null;
      }
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

    fingerprint(extra) {

      if (super.fingerprint === undefined) {
        //console.log('about to fingerprint:');
        //console.log(this);
        //console.log(extra);
        //console.log('result :' + Store.objectFingerprint(this, extra));
        return Store.objectFingerprint(this, extra);
      } else {
        return super.fingerprint(extra);
      }
    }

    fingerprintWithExtraInfo(extra) {
      return this.fingerprint(extra);
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

    autoPullDependencies() {
      if (super.autoPullDependencies !== undefined) {
        return super.autoPullDependencies();
      } else {
        return true;
      }
    }


    signWith(identityKey) {
      // the following is necessary because we want to sign the object
      // resulting _after_ adding the signature (only the identity is
      // used for fingerprinting, not the signature per se)
      this.addSignature(identityKey.deriveIdentity().fingerprint(), '');
      this.addSignature(identityKey.deriveIdentity().fingerprint(), identityKey.sign(this.fingerprint()));
    }

    signWithMany(identityKeys) {
      for (let identityKey of identityKeys) {
        this.addSignature(identityKey.deriveIdentity().fingerprint(), '');
      }
      for (let identityKey of identityKeys) {
        this.addSignature(identityKey.deriveIdentity().fingerprint(), identityKey.sign(this.fingerprint()));
      }
    }

    signForIdentity(identity) {
      this.signWith(identity.getIdentityKey());
    }

    signForIdentities(identities) {
      this.signWithMany(identities.map(id => id.getIdentityKey()));
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
      serial['signatures']   =  this.signatures;
      return serial;
    }

    deserialize(serial) {
      this.tags       = new Set(serial['tags']);
      this.keyFingerprints = new Set(serial['keys']);
      this.timestamp  = serial['timestamp'];
      this.signatures = serial['signatures'];
      super.deserialize(serial);
    }

    fullContentHash(parents) {
      if (parents === undefined) {
        parents = [];
      }
      let extra = {};

      extra['full-content-hash-parents'] = parents.join('-');

      let newParents = parents.slice();
      newParents.push(this.fingerprint());

      for (let fp in this.dependencies) {
        extra['full-content-hash-child-' + fp] =
          this.dependencies[fp].fullContentHash(newParents);
      }

      return this.fingerprintWithExtraInfo(extra);
    }
  }
}

class StorageManager {
  constructor() {
    this.stores = new Map();
    this.directory = openDB('account-instance-directory', 1, {
        upgrade(newdb, oldVersion, newVersion, tx) {
          newdb.createObjectStore(_INSTANCES, {keyPath: 'instance'});
      }
    });
  }

  createStoreForInstance(instance) {

    let instanceRecord = {'account'     : instance.getAccount().fingerprint(),
                          'accountInfo' : instance.getAccount().getIdentity().getInfo(),
                          'instance'    : instance.fingerprint(),
                          'instanceInfo': instance.getIdentity().getInfo()};

    return this.directory.then((db) => {
      const tx = db.transaction([_INSTANCES], 'readwrite');
      tx.objectStore(_INSTANCES).put(instanceRecord);
      return tx.done;
    })
    .then(() => this.getStore(instance.fingerprint()));
  }

  getStore(accountInstanceFP) {
    if (this.stores.has(accountInstanceFP)) {
      return this.stores.get(accountInstanceFP);
    } else {
      const store = new Store(accountInstanceFP);
      this.stores.set(accountInstanceFP, store);
      return store;
    }
  }

  getAllInstanceRecords() {
    return this.directory.then(
      (db) => (db.transaction([_INSTANCES], 'readonly').objectStore(_INSTANCES).getAll()));
  }


  getInstanceRecord(accountInstanceFP) {
    return this.directory.then(
      (db) => (db.transaction([_INSTANCES], 'readonly').objectStore(_INSTANCES).get(accountInstanceFP)));
  }
}

class StorableValueBase {
  constructor(value) {

    this.type = Types.STORABLE_VALUE();

    this.initializeStorable({noTimestamp: true});

    if (value !== undefined) {
      this.value = value;
    } else {
      this.value = null;
    }
  }

  getValue() {
    return this.value;
  }

  serialize() {
    return {
      'value' : this.value,
      'type'  : this.type
    };
  }

  deserialize(serial) {
    this.value = serial['value'];
  }
}

const StorableValue = storable(StorableValueBase);

export {StorageManager, StorableValue, storable};
