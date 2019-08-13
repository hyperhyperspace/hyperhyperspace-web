import { Types } from '../../core/data/types.js';
import { storable } from '../../core/data/storage.js';
import { ReplicationService } from '../../core/data/replication.js';
import { ReplicatedObjectSet } from '../../core/data/replicated/set.js';

/******************************************************

A: sends contact request
B: receives conctact request

1. A packs:  - his acct identity,
             - his info (must match identity),
             - a working linkup host,
             - a random secret

into an URL that can be send out-of-band and opened in
the hyperhyper.space website.

At the same time, A stores the random secret along of
a note of to whom the invite was sent to, to compare
later.

2. B opens URL and owner decides if he wants to
   accept contact or not

3.1 To reject contact request, B sends a message over
    to A rejecting invitation for the received shared
    secret. END.
3.2 To ignore a contact request, B does nothing. END.
3.3 To accept a contact request, B packs:

    - his acct info,
    - the received random secret

    and sends this information to A.

4. A checks the received random secret against the
   stored secrets and adds the account to the list
   of known contacts if it matches any, also
   informing the owner who can invalidate the action
   if the received account's information is not what
   he expected. Finally he sends his own account
   information to B so he can do the same.

5. B checks that the received account has the same
   identity and name as in the original URL packed
   info, and finally adds A's info to the list of
   known accounts.

*******************************************************/


const CONTACTS_SET = 'people.contacts';

class ContactsService {

  static SERVICE_NAME = 'contacts';

  constructor(peer) {
    this.peer  = peer;
    this.store = peer.getStore();

    this.account = null;
    this.contacts = null;
    this.receivedContactRequests = null;
    this.sentContactRequests     = null;

    this.waitForInit = null;
  }

  getServiceName() {
    return ContactsService.SERVICE_NAME;
  }

  start() {

    if (this.waitForInit === null) {
      this.logger.info('Starting contacts service for instance ' + this.peer.getAccountInstanceFingerprint());
      this.waitForInit = this._init().then(() => {
        this.logger.trace('Started contacts service for instance ' + this.peer.getAccountInstanceFingerprint());
      });
    }

    return this.waitForInit;
  }

  waitUntilStartup() {
    return this.waitForInit;
  }

  receiveMessage(source, destination, service, contents) {
    console.log('msg from ' + source.fingerprint() + ': ' + contents);
  }


  addContact(contact) {

  }

  async _init() {

    await this.peer.getService(ReplicationService.SERVICE_NAME).waitUntilStartup();

    let instance  = await this.store.load(this.peer.getAccountInstanceFingerprint());
    this.account  = instance.getAccount();

    this.account.subscribe(this.store);

    await this.account.pull(this.store);

    let datasets  = this.account.getDatasets();
    this.contacts = datasets.get(CONTACTS_SET);
    if (this.contacts === undefined) {
      let replId = datasets.getReplicationIdFor(CONTACTS_SET, Types.REPL_OBJECT_SET());
      this.contacts = new ReplicatedObjectSet(this.account.getIdentity(), {'replicationId': replId});
      datasets.set(CONTACTS_SET, this.contacts);

      await this.account.push(this.store);
    }
  }
}

class SentContactRequestBase {
  constructor(sender, receiverName, senderName) {
    if (sender !== undefined) {
      this.sender       = sender;
      this.receiverName = receiverName;
    }
  }
}

class ContactRequestMessageBase {
  constructor(senderIdFP, senderName, challenge) {
    this.senderIdFP = senderIdFP === undefined? null : senderIdFP;
    this.senderName = senderName === undefined? null : senderName;
    this.challenge = challenge   === undefined? null : challenge;
  }

  serialize() {
    return {
      'senderIdFP': this.senderIdFP,
      'senderName': this.senderName,
      'challenge' : this.challenge,
    }
  }

  deserialize(serial) {
    this.senderIdFP = serial['senderIdFP'];
    this.senderName = serial['senderName'];
    this.challenge  = serial['challenge'];
  }
}

class ContactBase {
  constructor(accountIdentity, verified, localName) {

    if (accountIdentity !== undefined) {
      this.accountIdentity = accountIdentity;
      this.addDependency(accountIdentity);
      this.verified        = verified;
      this.localName       = localName;
    }

    this.accountIdentity = null;
    this.verified        = null;
    this.localName       = null;
  }

  getAccountIdentity() {
    return this.accountIdentity;
  }

  getVerified() {
    return this.verified;
  }

  getLocalName() {
    return this.localName;
  }

  serialize() {
    return {
      'account-identity' : this.accountIdentity.fingerprint(),
      'verified'         : this.verified.toString(),
      'localname'        : this.localName
    };
  }

  deserialize(serial) {
    this.accountIdentity = this.getDependency(serial['account-identity']);
    this.verified        = serial['verified'] === 'true';
    this.localName       = serial['localname'];
  }


}

const Contact = storable(ContactBase);

export { ContactsService, Contact };
