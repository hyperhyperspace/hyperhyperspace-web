import JSEncrypt from 'jsencrypt';
import Hashes from 'jshashes';

class KeyPair {
  constructor(bits) {

    if (bits === undefined) bits = null;

    this.publicKey  = null;
    this.privateKey = null;
    this.hash     = null;
    this.crypto   = null;
    this.bits     = bits;

    this.SHA256 = new Hashes.SHA256().b64;
    this.RMD160 = new Hashes.RMD160().b64;

    this.SHA256hex = new Hashes.SHA256().hex
  }

  generateKeys(bits) {

    if (bits !== undefined) this.bits = bits;

    if (this.bits === null) this.bits = 1024;

    this.crypto = new JSEncrypt({default_key_size: this.bits.toString()});
    this.crypto.getKey();

    this.publicKey  = this.crypto.getPublicKey();
    this.privateKey = this.crypto.getPrivateKey();
  }

  fromKeys(publicKey, privateKey) {
    this.publicKey  = publicKey;
    this.privateKey = privateKey;
  }

  fromPublicKey(publicKey) {
    this.publicKey = publicKey;
  }

  getPublicKey() {
    return this.publicKey;
  }

  getPrivateKey() {
    return this.privateKey;
  }

  getHash() {
    this._computeHash();
    return this.hash;
  }

  checkHash(someHash) {
    this._computeHash();
    return this.hash === someHash;
  }

  encrypt(text) {
    this._initCrypto();
    return this.crypto.encrypt(text);
  }

  decrypt(cypher) {
    this._initCrypto();
    return this.crypto.decrypt(cypher);
  }

  sign(text) {
    this._initCrypto();
    return this.crypto.sign(text, this.SHA256hex, 'sha256');
  }

  verify(text, signature) {
    this._initCrypto();
    //return this.sign(text) === signature;
    return this.crypto.verify(text, signature, this.SHA256hex);
  }

  isPrivate() {
    return this.privateKey !== null;
  }

  serialize() {
    return {'public': this.publicKey, 'private': this.privateKey};
  }

  deserialize(obj) {
    this.publicKey = obj['public'];
    this.privateKey = obj['private'];
  }

  toJSON() {
    return JSON.stringify(this.serialize());
  }

  parseJSON(json) {
    var obj = JSON.parse(json);
    this.deserialize(obj);
  }

  public() {
    return new PublicKey(this.publicKey);
  }

  _computeHash() {

    if (this.hash == null) {
      var hash = this.SHA256(this.publicKey);
      //console.log('1. ' + hash);
      hash = this.RMD160('00' + hash);
      //console.log('2. ' + hash);
      hash = this.SHA256(hash);
      //console.log('3. ' + hash);
      hash = this.RMD160(hash);
      //console.log('4. ' + hash);
      this.hash = hash;
    }
  }

  _initCrypto() {
    if (this.crypto == null) {
      this.crypto = new JSEncrypt();
      if (this.publicKey != null) this.crypto.setPublicKey(this.publicKey);
      if (this.privateKey != null) this.crypto.setPrivateKey(this.privateKey);
    }
  }
}

class PublicKey extends KeyPair {
  constructor(publicKey) {
    super();
    this.fromPublicKey(publicKey);
  }
}

const SHA256 = new Hashes.SHA256().hex;
const RMD160 = new Hashes.RMD160().hex;

class Crypto {

  static fingerprint(text) {

    var fingerprint = SHA256(text);
    fingerprint = RMD160('00' + fingerprint);
    fingerprint = SHA256(fingerprint);
    fingerprint = '01' + RMD160(fingerprint);

    return fingerprint;
  }

  static checkFingerprint(text, fingerprint) {
    return fingerprint === Crypto.fingerprint(text);
  }

  static filterKeys(object, allowedKeys) {
    var filtered = {};
    Object.keys(object).forEach(key => {
      if (allowedKeys.includes(key)) {
        filtered[key] = object[key];
      }
    });
    return filtered;
  }

  static fingerprintLiteral(object, keys) {
    if (keys !== undefined) {
      object = Hashes.filterKeys(object, keys);
    }
    return Crypto.fingerprint(Crypto.stringify(object));
  }

  static checkFingerprintLiteral(object, fingerprint, keys) {
    if (keys !== undefined) {
      object = Crypto.filterKeys(object, keys);
    }
    return Crypto.checkFingerprint(Crypto.stringify(object), fingerprint);
  }

  static hash(text) {
    return SHA256(text);
  }

  static checkHash(text, hash) {
    return hash === Crypto.hash(text);
  }

  static hashObject(object) {
    return Crypto.hash(Crypto.stringify(object));
  }

  static checkObjectHash(object, hash) {
    return Crypto.checkHash(Crypto.stringify(object), hash);
  }

  static stringify(object) {

    var plain = '';

    if (typeof object === 'object') {
      var keys = Object.keys(object);
      keys.sort();

      keys.forEach(key => {
        if (key !== 'fingerprint') {
          plain = plain +
                  Crypto._toEscapedString(key) + ':' + Crypto.stringify(object[key]) + ',';
        }
      });
    } else {
      plain = Crypto._toEscapedString(object.toString());
    }

    return plain;
  }

  static _toEscapedString(something) {
    return "'" + something.toString().replace("'", "''") + "'";
  }

}

export { KeyPair, PublicKey, Crypto } ;
