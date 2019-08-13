import { LinkupManager, Endpoint }   from '../net/linkup.js';
import { NetworkManager }  from '../net/network.js';
import { DeliveryService } from '../net/delivery.js';

import { StorageManager, storable }  from '../data/storage.js';
import { ReplicationService }     from '../data/replication.js';

import { IdentityService } from './identity.js';
import { Identity, IdentityKey } from './identity.js';
import { Account, AccountInstance } from './accounts.js';

import { ConsoleService } from '../../services/development/console.js';

import Logger from '../util/logging';

class PeerManager {

  constructor() {
    this.storageManager  = new StorageManager();
    this.linkupManager   = new LinkupManager();
    this.networkManager  = new NetworkManager(this.linkupManager);

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
                                  .then(() => instance);
               });
  }

  activatePeerForInstance(fingerprint) {
    const peer = new Peer(this, fingerprint);

    this.peers.set(fingerprint, peer);

    return peer;
  }

  getAvailableInstanceRecords() {
    return this.storageManager.getAllInstanceRecords();
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

const _LINKUP_SERVER = 'ws://localhost:3002';
//const _LINKUP_SERVER = 'wss://mypeer.net';

class Peer {

  static INSTANCE_DELIVERY_SERVICE = 'instance-delivery';
  static CONSOLE_SERVICE = 'console';

  constructor(peerManager, fingerprint) {

    this.logger = new Logger(this);
    this.logger.setLevel(Logger.INFO());

    this.fingerprint = fingerprint;
    this.peerManager = peerManager;
    this.store       = peerManager.getStorageManager().getStore(fingerprint);

    this.instance    = null;

    this.routeIncomingMessageBound = this.routeIncomingMessage.bind(this);

    this.services = new Map();

    this.waitForInit = null;

  }

  start() {

    if (this.waitForInit === null) {
      let ownInit = this._init();

      this.waitForInit = ownInit
      .then(() => {
        let servicesToInit = Array.from(this.services.values());
        Promise.all(servicesToInit.map(s => s.start()));
      }).then(() => {
        this.logger.info('All services started for instance ' + this.fingerprint);
        return this;
      });
    }

    return this.waitForInit;

  }

  async waitUntilStartup() {
    return this.initialization;
  }

  async _init() {
    this.instance = await this.store.load(this.fingerprint);

    let account = this.instance.getAccount();

    this.deliveryService = new DeliveryService(this,
                                              this.instance.getAccount().getIdentity(),
                                              _LINKUP_SERVER,
                                              this.routeIncomingMessageBound
                                            );


    this.registerService(this.deliveryService);

    this.replicationService = new ReplicationService(this);

    this.registerService(this.replicationService);

    this.consoleService = new ConsoleService(this);

    this.registerService(this.consoleService);

  }

  registerService(service) {
    this.services.set(service.getServiceName(), service);
  }

  deregisterService(name) {
    this.services.delete(name);
  }

  getService(name) {
    return this.services.get(name);
  }

  routeIncomingMessage(source, destination, wireFmt) {

    this.logger.debug(this.fingerprint + ' is routing INCOMING message src:' + source.fingerprint() + ' dst: ' + destination.fingerprint());
    this.logger.trace('content:' + wireFmt);

    let msg = new PeerMessage();
    msg.fromWireFormat(wireFmt);

    let service = this.services.get(msg.destinationService);

    if (service !== undefined) {
      service.receiveMessage(source, destination, msg.destinationService, msg.contentLiteral);
    } else {
      this.logger.warning('Received incoming messege for unregistered service: ' + msg.destinationService);
    }

  }

  async routeOutgoingMessage(sourceFP, destinationFP, destinationService, contentLiteral) {
    this.logger.debug(this.fingerprint + ' is routing OUTGOING message src:' + sourceFP + ' dst: ' + destinationFP);
    this.logger.trace('content:' + JSON.stringify(contentLiteral));
    return this.routeOutgoingMessageTmp(sourceFP, destinationFP, _LINKUP_SERVER, destinationService, contentLiteral);
  }

  async routeOutgoingMessageTmp(sourceFP, destinationFP, destinationLinkup, destinationService, contentLiteral) {
    if (sourceFP !== this.instance.getAccount().getIdentity().fingerprint()) {
      throw new Error('Sorry, routng is supported only from the account identity for the time being.');
    }

    await this.initialization;

    let msg = new PeerMessage(sourceFP, destinationFP, destinationService, contentLiteral);

    this.deliveryService.send(destinationFP, destinationLinkup, msg.toWireFormat(), 30);
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
}

class PeerMessage {
  constructor(sourceIdentity, destinationIdentity, destinationService, contentLiteral) {
    this.sourceIdentity      = sourceIdentity === undefined? null : sourceIdentity;
    this.destinationIdentity = destinationIdentity === undefined? null : destinationIdentity;
    this.destinationService  = destinationService === undefined? null : destinationService;
    this.contentLiteral      = contentLiteral;
  }

  toWireFormat() {
    return JSON.stringify({'source':      this.sourceIdentity,
                           'destination': this.destinationIdentity,
                           'service':     this.destinationService,
                           'content':     this.contentLiteral});
  }

  fromWireFormat(payload) {
    let literal = JSON.parse(payload);
    this.sourceIdentity      = literal['source'];
    this.destinationIdentity = literal['destination'];
    this.destinationService  = literal['service'];
    this.contentLiteral      = literal['content'];
  }
}

export { PeerManager, Peer };
