import { Types } from '../data/types.js';
import { storable } from '../data/storage.js';
import { ReplicatedSet } from '../data/replicated/set.js';
import { Identity, IdentityKey } from './identity.js';

class AccountBase {
  constructor(identityKey) {
    this.identity = null;
    this.instances = null;

    if (identityKey !== undefined) {
      this.identity = identityKey.getIdentity();
      this.instances = new ReplicatedSet(identityKey);
      this.addDependency(this.identity);
      this.addDependency(this.instances);
      this.addKey(this.identityKey);
    }
  }

  createInstance(info) {
    let key = this.getKeyForIdentity(this.identity);
    let instanceKey = key.generateSecondary(info);
    let instance = new AccountInstance(this, instanceKey);
    instance.signWith(key);
    this.instances.add(instance, key);
    return instance;
  }

  removeInstance(fingerprint) {
    return this.instances.remove(fingerprint);
  }

  pull(store) {
    return this.instances.pull(store);
  }

  flush(store) {
    return this.instances.flush(store);
  }

  sync(store) {
    return this.instances.sync(store);
  }

  subscribe(store) {
    return this.instances.subscribe(store);
  }

  unsubscribe(store) {
    return this.instances.unsusbscribe(store);
  }

  serialize() {
    return {
      'identityfp': this.identity.fingerprint(),
      'instancesfp': this.instances.fingerprint()
    };
  }

  deserialize(serial) {
    this.identity = this.getDependency(serial['identityfp']);
    this.instances = this.getDependency(serial['instancesfp']);
  }
}

const Account = storable(AccountBase);

class AccountInstanceBase {
  constructor(account, instanceIdentityKey) {
    this.account = null;
    this.identity = null;
    this.linkup  = null;

    if (account !== undefined) {
      this.account = account;
      this.identity = instanceIdentityKey.getIdentity();
      this.linkup = new ReplicatedSet(instanceIdentityKey);
      this.addDependency(this.account);
      this.addDependency(this.identity);
      this.addDependency(this.linkup);
      this.addKey(instanceIdentityKey);
    }

    this.type = Types.ACCOUNT_INSTANCE();
  }

  serialize() {
    return {
      'accountfp' : this.account.fingerprint(),
      'identityfp': this.identity.fingerprint(),
      'linkupfp'  : this.linkup.fingerprint(),
    };
  }

  deserialize(serial) {
    this.account  = this.getDependency(serial['accountfp']);
    this.identity = this.getDependency(serial['identityfp']);
    this.linkup   = this.getDependency(serial['linkupfp']);
  }
}

const AccountInstance = storable(AccountInstanceBase);

export { Account, AccountInstance };
