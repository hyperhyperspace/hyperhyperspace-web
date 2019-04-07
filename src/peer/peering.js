
import IdentityManager from './identity.js';
import LinkupManager from '../net/linkup.js';
import NetworkManager from '../net/network.js';
import StorageManager from '../data/storage.js';

class PeerMaster {

  constructor() {
    this.storageManager   = new StorageManager();
    this.identityManager  = new IdentityManager(this.storageManager);
    this.linkupManager    = new LinkupManager();
    this.networkManager   = new NetworkManager(this.linkupManager);
    this.messagingManager = new MessagingManager(this.identityManager, this.networkManager, this.storageManager);

    this.peers = new Map();

  }

  activatePeer(fingerprint) {
    const peer = new Peer(this, fingerprint);

    this.peers.set(fingerprint, peer);
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

  getStorageManager() {
    return this.storageManager;
  }

}

class Peer {
  constructor(master, fingerprint) {

    this.fingerprint = fingerprint;

    this.master = master;

    this.store    = master.getStorageManager().getStore(fingerprint);

    this.identity = master.getIdentityManager().getRootIdentity(fingerprint);

    const endpoint = new Endpoint('wss://mypeer.net', fingerprint);
    this.node     = master.getNetworkManager().createNode(endpoint);

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
