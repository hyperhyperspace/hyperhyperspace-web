import { Types } from '../../core/data/types.js';
import { storable } from '../../core/data/storage.js';
import { ReplicationService } from '../../core/data/replication.js';
import { ReplicatedObjectSet } from '../../core/data/replicated/set.js';

const CONTACTS_SET = 'people.contacts';

class ContactsService {

  static SERVICE_NAME = 'contacts';

  constructor(peer) {
    this.peer  = peer;
    this.store = peer.getStore();

    this.account = null;
    this.contacts = null;

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
      this.contacts = new ReplicatedObjectSet(this.account.getIdentity(), replId);
      datasets.set(CONTACTS_SET, this.contacts);

      await this.account.push(this.store);
    }
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
