import { Types } from '../data/types.js';
import { storable } from '../data/storage.js';
import { ReplicatedSet, ReplicatedObjectSet } from '../data/replicated/set.js';
import { ReplicatedNamespace } from '../data/replicated/namespace.js';
import { Identity, IdentityKey } from './identity.js';

class AccountBase {
  constructor(identityKey) {

    this.type = Types.ACCOUNT();

    this.initializeStorable();

    this.identity = null;
    this.instances = null;
    this.linkup  = null;
    this.datasets = null;

    if (identityKey !== undefined) {
      this.identity = identityKey.deriveIdentity();
      this.instances = new ReplicatedObjectSet(this.identity);
      this.linkup = new ReplicatedSet(this.identity);
      this.datasets = new ReplicatedNamespace(this.identity);
      this.addDependency(this.identity);
      this.addDependency(this.instances);
      this.addDependency(this.linkup);
      this.addDependency(this.datasets);

      this.signForIdentity(this.identity);
    }
  }

  createInstance(info) {
    let key = this.identity.getIdentityKey();
    let instanceKey = key.generateSecondary(info);
    let instance = new AccountInstance(this, instanceKey);
    this.instances.add(instance, this.identity);
    return instance;
  }

  removeInstance(fingerprint) {
    return this.instances.removeFingerprint(fingerprint);
  }

  getIdentity() {
    return this.identity;
  }

  async pull(store) {
    await this.instances.pull(store);
    await this.linkup.pull(store);
    return this;
  }

  async flush(store) {
    await store.save(this);
    await this.instances.flush(store);
    await this.linkup.flush(store);
    return this;
  }

  async sync(store) {
    await store.save(this);
    await store.instance.sync(store);
    await store.linkup.sync(store);
    return this;
  }

  subscribe(store) {
    return this.instances.subscribe(store);
  }

  unsubscribe(store) {
    return this.instances.unsusbscribe(store);
  }

  addLinkupServer(url, priority) {
    this.linkup.add({'url': url, 'priority': priority}, this.identity);
  }

  getAllLinkupServers() {
    return this.linkup.snapshot();
  }

  getLinkupServerAlternatives() {
    let servers = Array.from(this.linkup.snapshot());
    return servers.sort((e1, e2) => e2.priority-e1.priority);
  }

  getPrimaryLinkupServer() {
    let servers = this.getLinkupServerAlternatives();
    if (servers.length > 0) {
      return servers[0];
    } else {
      return null;
    }
  }

  getSecondaryLinkupServer() {
    let servers = this.getLinkupServerAlternatives();
    if (servers.length > 1) {
      return servers[1];
    } else {
      return null;
    }
  }

  serialize() {
    return {
      'identity' : this.identity.fingerprint(),
      'instances': this.instances.fingerprint(),
      'linkup'   : this.linkup.fingerprint(),
      'datasets' : this.datasets.fingerprint(),
      'type'     : this.type
    };
  }

  deserialize(serial) {
    this.identity  = this.getDependency(serial['identity']);
    this.instances = this.getDependency(serial['instances']);
    this.linkup    = this.getDependency(serial['linkup']);
    this.datasets  = this.getDependency(serial['datasets']);
  }
}

const Account = storable(AccountBase);

class AccountInstanceBase {
  constructor(account, instanceIdentityKey) {

    this.type = Types.ACCOUNT_INSTANCE();

    this.initializeStorable();

    this.account = null;
    this.identity = null;

    if (account !== undefined) {
      this.account = account;
      this.identity = instanceIdentityKey.deriveIdentity();
      this.addDependency(this.account);
      this.addDependency(this.identity);
      this.signForIdentity(account.getIdentity());
    }
  }

  getAccount() {
    return this.account;
  }

  getIdentity() {
    return this.identity;
  }

  serialize() {
    return {
      'account' : this.account.fingerprint(),
      'identity': this.identity.fingerprint(),
      'type'      : this.type
    };
  }

  deserialize(serial) {
    this.account  = this.getDependency(serial['account']);
    this.identity = this.getDependency(serial['identity']);
  }
}

const AccountInstance = storable(AccountInstanceBase);

export { Account, AccountInstance };
