import Hashes from 'jshashes';

import { KeyPair, Crypto } from './crypto';

import { Types } from '../data/types.js';
import { storable } from '../data/storage.js';

const _ROOT_KEY = 'root';
const _AUTH_KEY = 'auth';

class IdentityManager {

  constructor(storageManager) {
    this.storageManager = storageManager;
  }

  createRootIdentityKey(type, name) {
    const info = {level: _ROOT_KEY,
                  type:  type,
                  name:  name};

    const root = new IdentityKey();

    root.create(info);

    this.storageManager.createStore(root);

    const store = this.storageManager.getStore(root.fingerprint());
    store.save(root);

    return root.fingerprint();

  }

  getRootIdentity(fingerprint) {
    return new AccountIdentity(fingerprint, this.storageManager.getStore(fingerprint));
  }
}

class AccountIdentity {
  constructor(fingerprint, store) {
    this.store      = store;
    this.root       = this.store.load(fingerprint);
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

  constructor() {
    this.key  = null;
    this.info = null;
    this.type = Types.IDENTITY_KEY();
  }

  // info is meant to be the definition of what this key is for
  // it can be any object as long as we can hash it.

  create(info) {
    this.info = info;
    this._generateKey();
  }

  generateVerifier() {

    const verifier = new IdentityKey();

    verifier.key   = this.key.public();
    verifier.info  = this.info;
    verifier.computeFingerprint();

    return verifier;
  }

  getInfo() {
    return this.info;
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

  serialize() {
    return {
      'key':  this.key.serialize(),
      'info': this.info,
      'type': this.type,
    };
  }

  deserialize(obj) {

    this.key = new KeyPair();
    this.key.deserialize(obj['key']);
    this.info    = obj['info'];
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

}

const IdentityKey = storable(IdentityKeyBase);

export { IdentityManager };
export default IdentityKey;
