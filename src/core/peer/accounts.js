import { Types } from '../data/types.js';
import { storable } from '../data/storage.js';
import { ReplicatedSet, ReplicatedObjectSet } from '../data/replicated/set.js';
import { ReplicatedNamespace } from '../data/replicated/namespace.js';

import { Identity } from '../../core/peer/identity.js';

class AccountBase {

  static type = 'hhs-account';
  static storableFields = { identity  : Identity,
                            instances : ReplicatedObjectSet,
                            linkup    : ReplicatedSet,
                            datasets  : ReplicatedNamespace
  };

  constructor(identityKey) {

    this.initializeStorable();

    if (identityKey !== undefined) {
      this.identity = identityKey.deriveIdentity();
      this.instances = new ReplicatedObjectSet(this.identity);
      this.linkup = new ReplicatedSet(this.identity);
      this.datasets = new ReplicatedNamespace(this.identity);

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
    await this.datasets.pull(store);
    return this;
  }

  async flush(store) {
    await store.save(this);
    await this.instances.flush(store);
    await this.linkup.flush(store);
    await this.datasets.flush(store);
    return this;
  }

  async sync(store) {
    await store.save(this);
    await store.instance.sync(store);
    await store.linkup.sync(store);
    await store.datasets.flush(store);
    return this;
  }

  subscribe(store) {
    this.instances.subscribe(store);
    this.linkup.subscribe(store);
    this.datasets.subscribe(store);

    return this;
  }

  unsubscribe(store) {
    this.instances.unsubscribe(store);
    this.linkup.subscribe(store);
    this.datasets.subscribe(store);
  }

  addLinkupServer(url) {
    this.linkup.add(url, this.identity);
  }

  getAllLinkupServers() {
    return this.linkup.snapshot();
  }

  /*
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
  */
  getInstances() {
    return this.instances;
  }

  getLinkup() {
    return this.linkup;
  }

  getDatasets() {
    return this.datasets;
  }
}

const Account = storable(AccountBase);
Types.registerClass(Account);

class AccountInstanceBase {

  static type = 'hhs-account-instance';
  static storableFields = { account  : Account,
                            identity : Identity
  };

  constructor(account, instanceIdentityKey) {

    this.initializeStorable();

    if (account !== undefined) {
      this.account = account;
      this.identity = instanceIdentityKey.deriveIdentity();
      this.signForIdentity(account.getIdentity());
    }
  }

  getAccount() {
    return this.account;
  }

  getIdentity() {
    return this.identity;
  }
}

const AccountInstance = storable(AccountInstanceBase);
Types.registerClass(AccountInstance);

export { Account, AccountInstance };
