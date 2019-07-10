import { openDB } from 'idb';

import { storable } from '../data/storage.js';

class DeliveryService {
  constructor(peer) {
    //this.identity = peer.getIdentity();
    //this.network  = peer.getNetwork();

    this.peer     = peer;
    this.store    = peer.getStore();

    this.accountInstance = null;
    this.messageStatusDb = null;

    this.startInit();
  }

  startInit() {

    let loadInstance = this.store.load(this.peer.getAccountInstanceFingerprint());
    let loadDB       = openDB('sync-' + this.peer.getAccountInstanceFingerprint(), 1, (db) => {
      const messageStatusStore = db.createStore('message-status', {keypath: 'messageFingerprint'});
    });

    this.init = Promise.all([loadInstance, loadDB])
                       .then(loads => {
                          [this.accountInstance, this.messageStatusDb] = loads;
                          this.networkNode = this.peer.getPeerManager()
                                                      .getNetworkManager();
                       }).then(() => {

                       });

  }

  send(message) {

  }


}


class Message {

  constructor(sender, recipient, decryptIdentity, payload, signature) {

    this.sender          = sender === undefined?          null : sender;
    this.recipient       = recipient === undefined?       null : recipient;
    this.decryptIdentity = decryptIdentity === undefined? null : decryptIdentity;
    this.payload         = payload === undefined?         null : payload;
    this.signature       = signature === undefined?       null : signature;

    this.fingerprint = this.sender === undefined? null : Crypto.fingerprintObject(this.serialize());
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
    this.type        = obj['type'];
    this.sender      = obj['sender'];
    this.recipient   = obj['recipient'];
    this.decryptKey  = obj['decryptKey'];
    this.payload     = obj['payload'];
    this.signature   = obj['signature'];
  }
}

class AccountLinkupInfoBase {
  constructor(identity, linkupUrl1, linkupUrl2, linkupUrl3) {
    if (identity !== undefined) {
      this.identity = identity;
      this.addDependency(identity);
    } else {
      this.identity = null;
    }

    this.linkupUrl1 = linkupUrl1 === undefined? null : linkupUrl1;
    this.linkupUrl2 = linkupUrl2 === undefined? null : linkupUrl2;
    this.linkupUrl3 = linkupUrl3 === undefined? null : linkupUrl3;
  }

  serialize() {
    return {
      'identity': this.identity.fingerprint(),
      'linkup1':  this.linkupUrl1,
      'linkup2':  this.linkupUrl2,
      'linkup3':  this.linkupUrl3
    };
  }

  deserialize(serial) {
    this.identity = this.getDependency(serial['identity']);
    this.linkup1  = serial['linkup1'];
    this.linkup2  = serial['linkup2'];
    this.linkup3  = serial['linkup3'];
  }
}

const AccountLinkupInfo = storable(AccountLinkupInfoBase);

export { DeliveryService };
