
import { LinkupManager }   from '../net/linkup.js';
import { NetworkManager }  from '../net/network.js';
import { StorageManager, storable }  from '../data/storage.js';
import { ReplicationManager }     from '../data/replication.js';

import { DeliveryService } from './delivery.js';
import { IdentityService } from './identity.js';

import { Endpoint } from '../net/linkup.js';
import { Identity, IdentityKey } from './identity.js';
import { Account, AccountInstance } from './accounts.js';

class PeerManager {

  constructor() {
    this.storageManager  = new StorageManager();
    this.linkupManager   = new LinkupManager();
    this.networkManager  = new NetworkManager(this.linkupManager);
    this.replicationManager = new ReplicationManager(this.networkManager, this.storageManager);

    this.peers = new Map();

  }

  createAccount(info) {

    let rootKey = new IdentityKey(info);
    let account = new Account(rootKey);

    return account;
  }

  createLocalAccountInstance(account, info) {
    let instance = account.createInstance(info);
    return this.storageManager.createStoreForInstance(instance)
               .then(store => {
                    return account.flush(store)
                                  .then(() => store);
               });
  }

  activatePeerForInstance(fingerprint) {
    const peer = new Peer(this, fingerprint);

    this.peers.set(fingerprint, peer);

    return peer;
  }

  getStorageManager() {
    return this.storageManager;
  }

  getLinkupManager() {
    return this.linkupManager;
  }

  getNetworkManager() {
    return this.networkManager;
  }

  getReplicationManager() {
    return this.replicationManager;
  }

}

class Peer {
  constructor(peerManager, fingerprint) {

    this.fingerprint = fingerprint;

    this.peerManager     = peerManager;
    this.store           = peerManager.getStorageManager().getStore(fingerprint);

    this.deliveryService = new DeliveryService(this);


    const endpoint = new Endpoint('wss://mypeer.net', fingerprint);
    //this.node     = peerManager.getNetworkManager().createNode(endpoint);

    this.services = new Map();

  }

  getAccountInstanceFingerprint() {
    return this.fingerprint;
  }

  getPeerManager() {
    return this.peerManager;
  }

  getStore() {
    return this.store;
  }

  registerService(service) {
    service.init(this);
    this.services.put(service.getName(), service);
  }

  deregisterSerice(name) {
    const service = this.services.get(name);
    service.deinit();
    this.services.delete(name);
  }
}

export { PeerManager };
