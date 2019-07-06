import Hashes from 'jshashes';

import { KeyPair, Crypto } from './crypto';
import { SyncSet } from '../data/collections/set.js';

import { Types } from '../data/types.js';
import { storable } from '../data/storage.js';

const _ROOT_KEY = 'root';
const _AUTH_KEY = 'auth';

class IdentityManager {

  constructor(storageManager) {
    this.storageManager = storageManager;
  }

  createRoot(type, name) {
    const info = {level: _ROOT_KEY,
                  type:  type,
                  name:  name};

    const root = new IdentityKey();

    root.create(info);

    return root;
  }

  setupIdentity(root, store, sync) {
    //const store = this.storageManager.getStore(root.fingerprint());

    return store.save(root).then(() => {
      const keySet = SyncSet.create(root.fingerprint(), [root.fingerprint()]);
      keySet.tag(IdentityService._KEY_TAG + root.fingerprint());
      return store.save(keySet).then(
             sync.add2WaySyncDirectives(keySet, root.fingerprint()));
      });
  }

  getIdentityService(root) {
    return new IdentityService(root, this.storageManager.getStore(root));
  }
}


// a repository of the locally known identities, backed on the account's store


class IdentityService {

  static _KEY_TAG = 'key-for-';
  constructor(root, store) {
    this.store   = store;
    this.root    = root;
    this.keys = new Map();
    this.derivedKeyMap = new Map();
  }

  init() {
    let loadKeys = this.store.loadAllByType(Types.IDENTITY_KEY()).then(iks => {
      iks.forEach(ik => {
        this.keys.set(ik.fingerprint(), ik);
        if (ik.getParam('type')   !== _ROOT_KEY &&
            ik.getParam('parent') !== _AUTH_KEY) {

              let parentKeys = this._getDerivedKeySet(ik.getParam('parent'));
              parentKeys.add(ik.fingerprint());

        }
      });
    });

    return loadKeys;
  }

  _getDerivedKeySet(parent) {
    var derivedKeySet = this.derivedKeyMap.get(parent);

    if (derivedKeySet === undefined) {
      derivedKeySet = new Set();
      this.derivedKeyMap.put(parent)
    }

    return derivedKeySet;
  }

  async getRootKey() {
    var result = await this.root;
    return result;
  }

  createAuthKey(info) {

    return this.root.then(root => {
      info['parent'] = root.fingerprint();
      info['type']   = _AUTH_KEY;

      const auth = new IdentityKey();
      auth.create(info);

      return this.store.save(auth);
    });

  }

  saveKey(key) {
    return this.store.save(key);
  }

  loadKey(fingerprint) {
    return this.store.load(fingerprint);
  }

  sign(key, object) {
    return this.store.load(key).then(key => {
      object.sign(key);
    })
  }

  isKnown(fingerprint) {
    return this.store.load(fingerprint).then(key => (key !== undefined));
  }

}

// An identity key is the basic unit of identity on the Hyper
// Hyper Space: a user is identified by a root IdentityKey, which is
// composed of a key pair, and some additional information.
// The public key and the information are hashed together, and the
// resulting hash is then signed using the key. This signature is
// called a 'fingerprint' and is used as an identity.

// From a root key, child keys can be generated and signed for
// secondary encryption needs (like day-to-day messages, etc.)

class IdentityKeyBase {

  // info is meant to be the definition of what this key is for
  // it can be any object as long as we can hash it.

  constructor(info, parentIdentity) {

    this.info = info === undefined? null : info;
    this.key  = null;

    this.identity       = null;
    this.parentIdentity = null;

    if (parentIdentity !== undefined) {
      this.parentIdentity = parentIdentity;
      this.addDependency(this.parentIdentity);
    }


    if (this.info !== null) {
      this._generateKey();
      this._generateIdentity();
    }

    this.type = Types.IDENTITY_KEY();

  }

  generateSecondary(info) {
    let secondary = new IdentityKey(info, this.identity);
    secondary.signWith(this);
  }

  fingerprint() {
    let literal = {'key': this.key.getHash(), 'info': this.info, 'type': this.type};
    if (this.parentIdentity !== null) {
      literal['parentfp'] = this.parentIdentity.fingerprint();
    }
    return Crypto.fingerprintLiteral(literal);
  }

  getIdentity() {
    return this.identity;
  }

  getParentIdentity() {
    return this.parentIdentity;
  }

  getInfo() {
    return this.info;
  }

  getParam(key) {
    return this.info[key];
  }

  sign(text) {
    return this.key.sign(text);
  }

  verify(text, signature) {
    return this.key.verify(text, signature);
  }

  encrypt(text) {
    return this.key.encrypt(text);
  }

  decrypt(cypher) {
    return this.key.decrypt(cypher);
  }

  /*
  generateSignedId() {
    return this.key.generateSignedId();
  }

  checkSignedId(id) {
    return this.key.checkSignedId(id);
  }
  */

  serialize() {
    let serial = {
      'key':  this.key.serialize(),
      'info': this.info,
      'type': this.type,
      'identityfp': this.identity.fingerprint()
    };

    if (this.parentIdentity !== null) {
      serial['parentfp'] = this.parentIdentity.fingerprint();
    }

    return serial;
  }

  deserialize(serial) {
    this.key = new KeyPair();
    this.key.deserialize(serial['key']);
    this.info    = serial['info'];
    this.identity = this.getDependency(serial['identityfp']);
    if ('parentfp' in serial ) {
      this.parentIdentity = this.getDependency(serial['parentfp']);
    } else {
      this.parentIdentity = null;
    }
  }

  toJSON() {
    return JSON.stringify(this.serialize());
  }

  parseJSON(json) {
    this.deserialize(JSON.parse(json));
  }

  _generateKey() {
    this.key = new KeyPair(2048);
    this.key.generateKeys();
  }

  _generateIdentity() {
    this.identity = new Identity(this.key.public(), this.info, this.parentIdentity);
    this.identity.addKey(this);
    this.addDependency(this.identity);
  }

}

const IdentityKey = storable(IdentityKeyBase);

class IdentityBase {
  constructor(publicKey, info, parentIdentity) {
    if (publicKey === undefined) {
      this.key = null;
      this.info = null;
    } else {
      this.key  = publicKey;
      this.info = info;
    }
    if (parentIdentity === undefined) {
      this.parentIdentity = null;
    } else {
      this.parentIdentity = parentIdentity;
      this.addDependency(parentIdentity);
    }
    this.type = Types.IDENTITY();
  }

  fingerprint() {
    let literal = {'key': this.key.getHash(), 'info': this.info, 'type': this.type};
    if (this.parentIdentity !== null) {
      literal['parentfp'] = this.parentIdentity.fingerprint();
    }
    return Crypto.fingerprintLiteral(literal);
  }

  getParent() {
    return this.parentIdentity;
  }

  getRoot() {
    var current = this;

    while (current.parentIdentity !== null) {
      current = current.parentIdentity;
    }

    return current;
  }

  getInfo() {
    return this.info;
  }

  getParam(name) {
    return this.info[name];
  }

  verify(text, signature) {
    return this.key.verify(text, signature);
  }

  encrypt(text) {
    return this.key.encrypt(text);
  }

  serialize() {
    let serial = {
      'key':  this.key.serialize(),
      'info': this.info,
      'type': this.type,
    };

    if (this.parentIdentity !== null) {
      serial['parentfp'] = this.parentIdentity.fingerprint();
    }

    return serial;
  }

  deserialize(serial) {
    this.key = new KeyPair();
    this.key.deserialize(serial['key']);
    this.info    = serial['info'];
    if ('parentfp' in serial) {
      this.parentIdentity = this.getDependency(serial['parentfp']);
    }
  }

  getIdentityKeyFingerprint() {
    let literal = {'key': this.key.getHash(), 'info': this.info, 'type': Types.IDENTITY_KEY()};
    if (this.parentIdentity !== null) {
      literal['parentfp'] = this.parentIdentity.fingerprint();
    }
    return Crypto.fingerprintLiteral(literal);
  }

  getIdentityKey() {
    return this.getKey(this.getIdentityKeyFingerprint());
  }

}

const Identity = storable(IdentityBase);

export { IdentityManager, Identity, IdentityKey };
