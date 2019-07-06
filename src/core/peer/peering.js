
import { IdentityManager } from './identity.js';
import { LinkupManager }   from '../net/linkup.js';
import { NetworkManager }  from '../net/network.js';
import { StorageManager, storable }  from '../data/storage.js';
import { ReplicationManager }     from '../data/replication.js';

import { Endpoint } from '../net/linkup.js';

class PeerManager {

  constructor() {
    this.storageManager  = new StorageManager();
    this.identityManager = new IdentityManager(this.storageManager);
    this.linkupManager   = new LinkupManager();
    this.networkManager  = new NetworkManager(this.linkupManager);
    this.replicationManager = new ReplicationManager(this.identityManager, this.networkManager, this.storageManager);

    this.peers = new Map();

  }

  createAccount(type, name) {
    const root = this.identityManager.createRoot(type, name);

    return this.storageManager.createStore(root).then(
      () => {
        this.syncManager.setupSync(root).then(() => {
            return this.identityManager.setupIdentity()
        });
      });
  }

  activatePeer(fingerprint) {
    const peer = new Peer(this, fingerprint);

    this.peers.set(fingerprint, peer);
  }

  getStorageManager() {
    return this.storageManager;
  }

  getIdentityManager() {
    return this.identityManager;
  }

  getLinkupManager() {
    return this.linkupManager;
  }

  getNetworkManager() {
    return this.networkManager;
  }

  getSyncManager() {
    return this.syncManager;
  }

}

class AccountManifestBase {
  constructor(root, keys, devices, linkup) {
    this.root    = root===undefined? null : root;
    this.keys    = keys===undefined? null : keys;
    this.devices = devices===undefined? null : devices;
    this.linkup  = linkup===undefined? {} : linkup;
  }

  serialize() {
    return {
      'root'    : this.root,
      'keys'    : this.keys,
      'devices' : this.devices,
      'linkup'  : this.linkup
    };
  }

  deserialize(obj) {
    this.root    = obj['root'];
    this.keys    = obj['keys'];
    this.devices = obj['devices'];
    this.linkup  = obj['linkup']
  }
}

const AccountManifest = storable(AccountManifestBase);

class Peer {
  constructor(peerManager, fingerprint) {

    this.fingerprint = fingerprint;

    this.peerManager = peerManager;

    this.store    = peerManager.getStorageManager().getStore(fingerprint);

    this.identity = peerManager.getIdentityManager().getIdentityService(fingerprint);

    const endpoint = new Endpoint('wss://mypeer.net', fingerprint);
    this.node     = peerManager.getNetworkManager().createNode(endpoint);

    this.services = new Map();

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

export { PeerManager, AccountManifest };
