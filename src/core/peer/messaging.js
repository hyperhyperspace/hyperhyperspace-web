


class MessagingService {
  constructor(peer) {
    this.identity = peer.getIdentity();
    this.network  = peer.getNetwork();
    this.store    = peer.getStore();

    this.account = null;
    this.accountInstance = null;
  }

  activate(accountInstance) {
    this.account = accountInstance.account;
    this.accountReplica = accountReplica;

    this.syncdb = openDB('sync-' + accountReplica.fingerprint(), 1, (db) => {
      const messageStatusStore = db.createStore('message-status', {keypath: 'messageFingerprint'});
    });
  }

  send(message) {

  }


}


class Message {

  constructor(sender, recipient, decryptKey, payload, signature) {

    this.sender     = sender === undefined? null     : sender;
    this.recipient  = recipient === undefined? null  : recipient;
    this.payload    = payload === undefined? null    : payload;

    this.fingerprint = this.sender === undefined? null : Crypto.fingerprintObject(message.serialize());
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
