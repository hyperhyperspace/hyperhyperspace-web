import { KeyPair, Crypto } from './crypto';
import { Types } from '../data/types.js';
import { storable } from '../data/storage.js';


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

    this.type = Types.IDENTITY_KEY();

    this.initializeStorable();

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
  }

  generateSecondary(info) {
    let secondary = new IdentityKey(info, this.identity);
    secondary.signWith(this);
    return secondary;
  }

  fingerprint(extra) {

    let literal = {'key': this.key.getHash(), 'info': this.info, 'type': this.type};
    if (this.parentIdentity !== null) {
      literal['parentfp'] = this.parentIdentity.fingerprint();
    }

    if (extra !== undefined) {
      for (let prop in extra) {
        literal[prop] = extra[prop];
      }
    }

    return Crypto.fingerprintLiteral(literal);
  }

  deriveIdentity() {
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

  serialize() {
    let serial = {
      'key':  this.key.serialize(),
      'info': this.info,
      'type': this.type,
    };

    if (this.parentIdentity !== null) {
      serial['parent'] = this.parentIdentity.fingerprint();
    }

    return serial;
  }

  deserialize(serial) {
    this.key = new KeyPair();
    this.key.deserialize(serial['key']);
    this.info    = serial['info'];
    if ('parent' in serial ) {
      this.parentIdentity = this.getDependency(serial['parent']);
    } else {
      this.parentIdentity = null;
    }

    this._generateIdentity();
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
    if (this.parentIdentity === null) {
      this.identity = new Identity(this.key.public(), this.info);
    } else {
      this.identity = new Identity(this.key.public(), this.info, this.parentIdentity);
    }
    this.identity.addKey(this);
  }

}

const IdentityKey = storable(IdentityKeyBase);

class IdentityBase {
  constructor(publicKey, info, parentIdentity) {

    this.type = Types.IDENTITY();

    this.initializeStorable();

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

  }

  fingerprint(extra) {
    let literal = {'key': this.key.getHash(), 'info': this.info, 'type': this.type};
    if (this.parentIdentity !== null) {
      literal['parentfp'] = this.parentIdentity.fingerprint();
    }

    if (extra !== undefined) {
      for (let prop in extra) {
        literal[prop] = extra[prop];
      }
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

class IdentityService {
  constructor(peer) {
    this.peer  = peer;

    this.accountInstanceFingerprint = peer.getAccountInstanceFingerprint();
    this.store = peer.getStore();


  }
}

export { Identity, IdentityKey, IdentityService };
