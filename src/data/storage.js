import idb from 'idb';

import { Crypto } from '../peer/crypto.js';
import { Types } from './types.js';

const _ATOMS    = 'atoms';
const _ACCOUNTS = 'accounts';

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

class Atom {

  static literalFingerprint(literal) {
    return Crypto.fingerprintLiteral(literal);
  }

  static objectFingerprint(object) {
    return Atom.literalFingerprint(object.serialize());
  }

  constructor() {
    this.fingerprint = null;
    this.object      = null;
    this.signatures  = [];
  }

  create(object) {
    this.object      = object;
    this.fingerprint = Atom.objectFingerprint(this.object);

    if (object.signatures !== undefined &&
        object.signatures instanceof Set) {
      this.signatures = Array.from(object.signatures);
    } else {
      this.signatures = [];
    }

  }

  getLiteral() {
    return this.object.serialize();
  }

  getObject() {
    return this.object;
  }

  checkFingerprint() {
    return this.fingerprint === Crypto.fingerprintObject(this.object);
  }

  checkSignature(key) {

    var check = false;

    this.signatures.forEach( (pair) => {
      if (pair['key'] === key.getSignature &&
          key.verify(this.fingerprint, pair['signature'])) {
        check = true;
      }
    });

    return check;
  }

  serialize() {
    return {'fingerprint': this.fingerprint,
            'literal':     this.object.serialize(),
            'signatures':  this.signatures,
          };
  }

  deserialize(obj) {
    this.fingerprint = obj['fingerprint'];
    this.object      = Types.deserializeWithType(obj['literal']);
    this.signatures  = obj['signatures'];
  }
}



class AccountStore {
  constructor(fingerprint) {
    this.fingerprint = fingerprint;
    this.dbPromise = idb.open('account-' + fingerprint, 1, newdb => {
      var atomStore = newdb.createObjectStore(_ATOMS, {keyPath: 'fingerprint'});
      atomStore.createIndex("tags", "literal.tags", {multyEntry: true});
      atomStore.createIndex("type", "literal.type")
    });

    this.tagCallbacks  = new Map();
    this.typeCallbacks = new Map();
  }

  save(object) {
    const atom = new Atom();
    atom.create(object);
    return this.saveAtom(atom);
  }

  load(fingerprint) {
    return this.loadAtom(fingerprint).then((atom) => (atom.getObject()));
  }

  saveAtom(atom) {
    return this.dbPromise.then( (db) => {
      const tx = db.transaction([_ATOMS], 'readwrite');
      tx.objectStore(_ATOMS).put(atom.serialize());
      return tx.complete;
    }).then((txresult) => {

      if (atom.object.tags !== undefined &&
          atom.object.tags instanceof Set) {
        atom.object.tags.forEach(tag => {
          if (this.tagCallbacks.has(tag)) {
            this.tagCallbacks.get(tag).forEach( callback => {
              window.setTimeout(callback, 0, atom.object);
            });
          }
        });
      }

      if (atom.object.type !== undefined &&
          this.typeCallbacks.has(atom.object.type)) {
        this.typeCallbacks.get(atom.object.type).forEach( callback => {
          window.setTimeout(callback, 0, atom.object);
        });
      }

      return txresult;
    });
  }

  loadAtom(fingerprint) {
    return this.dbPromise.then(
      (db) =>
        (db.transaction([_ATOMS], 'readonly').objectStore(_ATOMS).get(fingerprint)))
                         .then(
      (serialization) =>
        {
          var atom = new Atom();
          atom.deserialize(serialization);
          return atom;
        }
    );

  }

  registerTypeCallback(type, callback) {
    AccountStore._registerCallback(this.typeCallbacks, type, callback);
  }

  registerTagCallback(tag, callback) {
    AccountStore._registerCallback(this.tagCallbacks, tag, callback);
  }

  static _defineCallback(map, key, callback) {
    if (map.has(key)) {
      map.get(key).push(callback);
    } else {
      map.set(key, [callback]);
    }
  }
}

class StorageManager {
  constructor() {
    this.stores = new Map();
    this.directory = idb.open('account-directory', 1, (db) => {
      db.createObjectStore(_ACCOUNTS, {keyPath: 'fingerprint'});
    });
  }

  createStore(masterKey) {
    var account = new Account();

    account.fromIdentityKey(masterKey);

    return this.directory.then((db) => {
      const tx = db.transaction([_ACCOUNTS], 'readwrite');
      tx.objectStore(_ACCOUNTS).put(account.serialize());
      return tx.complete.then(() => (account));
    });
  }

  getStore(fingerprint) {
    if (this.stores.has(fingerprint)) {
      return this.stores.get(fingerprint);
    } else {
      const store = new AccountStore(fingerprint);
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
      this.tags       = new Set();
      this.signatures = [];
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

    getSingatures() {
      return this.signatures;
    }

    fingerprint() {
      return Atom.objectFingerprint(this);
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


    serialize() {
      var literal = super.serialize();
      literal['tags'] = Array.from(this.tags);
      return literal;
    }

    deserialize(literal) {
      super.deserialize(literal);
      this.tags = new Set(literal['tags']);
    }
  }
}

export {StorageManager, Account, storable};
