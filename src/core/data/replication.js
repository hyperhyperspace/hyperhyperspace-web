import { openDB } from 'idb';
import { v4 as uuid } from 'uuid';
import { Identity, IdentityKey, Crypto } from '../peer/crypto.js';
import { storable } from './storage.js';
import { OperationalSet } from './operational/set.js';
import { Types } from './types.js';

import Logger from '../util/logging';

class MetaOp {

  static tagFor(replicable) {
    return 'repl-op-for-' + replicable.fingerprint();
  }

  constructor(replicable, author, authOp, payload) {

    this.replicable = replicable === undefined? null : replicable;
    this.author     = author === undefined?     null : author;
    this.authOp     = authOp === undefined?     null : authOp;
    this.payload    = payload === undefined?    null : payload;

    this.initializeStorable();

    if (this.replicable !== null) this.addDependency(this.replicable);
    if (this.author     !== null) this.addDependency(this.author);
    if (this.authOp     !== null) this.addDependency(this.authOp);
    // If inside payload there are any storable objects that need to
    // be added as dependencies, the creator of the payload will do
    // so himself.

    if (replicable !== undefined) {
      this.tag(MetaOp.tagFor(replicable));
    }
  }

  getReplicable() {
    return this.replicable;
  }

  getAuthor() {
    return this.author;
  }

  getAuthOp() {
    return this.authOp;
  }

  getPayload() {
    return this.payload;
  }

  serialize() {
    let serial = {
      'replicable': this.replicable.fingerprint(),
      'author'    : this.author.fingerprint(),
      'payload'   : this.payload
    };

    if (this.authOp !== null) {
      serial['authOp'] = this.authOp.fingerprint();
    }

    return serial;
  }

  deserialize(serial) {
    this.replicable = this.getDependency(serial['replicable']);
    this.author     = this.getDependency(serial['author']);
    this.payload    = serial['payload'];

    if ('authOp' in serial) {
      this.authOp   = this.getDependency(serial['authOp']);
    }
  }

}

class DataOpBase extends MetaOp {

  constructor(replicable, author, authOp, payload, dependencies) {
    super(replicable, author, authOp, payload);

    this.type = Types.DATA_OP();

    if (dependencies !== undefined) {
      dependencies.forEach(dep => {
        this.addDependency(dep);
      });
    }

    if (author !== undefined) {
      this.signForIdentity(author);
    }
  }

  isControl() {
    return false;
  }

  verify() {
    return this.authOp !== null &&
           this.replicable.equals(this.authOp.getReplicable()) &&
           this.authOp.verify() &&
           this.authOp.getAction() === ControlOp.ADD_EMITTER &&
           this.authOp.getTarget().equals(this.getAuthor()) &&
           this.isSignedBy(this.getAuthor());
  }

  serialize() {
    let serial = super.serialize();
    serial['type'] = this.type;
    return serial;
  }

}

class ControlOpBase extends MetaOp {

  static ADD_ADMIN    = 'add-admin';
  static ADD_EMITTER  = 'add-emitter';
  static RECEIVER_SET = 'receiver-set';

  static tagFor(replicable) {
    return 'repl-control-op-for-' + replicable.fingerprint();
  }

  // author and target are identities
  constructor(replicable, author, authOp, action, target, auxOp) {

    var payload;
    if (action !== undefined && target !== undefined) {
      payload = {'action': action, 'target': target.fingerprint()};
      if (auxOp !== undefined) {
        payload['op'] = auxOp;
      }
    }

    super(replicable, author, authOp, payload);

    this.type = Types.CONTROL_OP();

    if (action !== undefined && target !== undefined) {
      this.action = action;
      this.target = target;
      this.addDependency(target);
      this.auxOp = auxOp === undefined? null : auxOp;
    }



    if (replicable !== undefined) {
      this.tag(ControlOp.tagFor(replicable));
    }

    if (author !== undefined) {
      this.signForIdentity(author);
    }
  }

  isControl() {
    return true;
  }

  getAction() {
    return this.action;
  }

  getTarget() {
    return this.target;
  }

  getAuxOp() {
    return this.auxOp;
  }

  verify() {
    return this.verifyAuthorSignature() &&
           this.verifyAuthorIsAdmin() && (
              this.verifyAddAdmin()    ||
              this.verifyAddEmitter()  ||
              this.verifyReceiverSet()
            );
  }

  verifyAuthorSignature() {
    return this.isSignedBy(this.author);
  }

  verifyAuthorIsAdmin() {
    if (this.author.equals(this.replicable.getCreator())) {
      return this.authOp === null && this.replicable.isSignedBy(this.author);
    } else {
      return this.authOp !== null &&
             this.authOp.replicable.equals(this.replicable) &&
             this.authOp.verify() &&
             this.authOp.action === ControlOp.ADD_ADMIN &&
             this.authOp.target.equals(this.author);
    }
  }

  verifyAddAdmin() {
    return this.action === ControlOp.ADD_ADMIN;
  }

  verifyAddEmitter() {
    return this.action === ControlOp.ADD_EMITTER;
  }

  verifyReceiverSet() {
    return this.action === ControlOp.RECEIVER_SET &&
           this.target.fingerprint() === this.auxOp['element'];
  }

  deserialize(serial) {
    super.deserialize(serial);
    this.action = this.payload['action'];
    this.target = this.getDependency(this.payload['target']);
    this.auxOp  = 'op' in this.payload? this.payload['op'] : null;
  }

  serialize() {
    let serial = super.serialize();
    serial['type'] = this.type;
    return serial;
  }

}

const ControlOp = storable(ControlOpBase);
const DataOp    = storable(DataOpBase);

class ReplicaControl {
  constructor(replicable) {

    this.replicable = null;
    this.admins     = {};
    this.emitters   = {};
    this.receivers  = new OperationalSet();
    this.allReceivers = new Map();

    if (replicable !== undefined) {
      this.replicable = replicable;
    }
  }

  apply(op) {
    if (op.isControl() && op.verify()) {
      let action = op.getAction();
      let target = op.getTarget();
      if (action === ControlOp.ADD_ADMIN) {
        this.admins[target.fingerprint()] = op;
      } else if (action === ControlOp.ADD_EMITTER) {
        this.emitters[target.fingerprint()] = op;
      } else if (action === ControlOp.RECEIVER_SET){
        this.allReceivers.set(target.fingerprint(), target);
        this.receivers.apply(op.getAuxOp());
      }
    }
  }

  isAdmin(identity) {
    return identity.fingerprint() in this.admins;
  }

  isEmitter(identity) {
    return identity.fingerprint() in this.emitters;
  }

  isReceiver(identity) {
    return this.receivers.has(identity.fingerprint());
  }

  getAdmins() {
    return new Set(Object.keys(this.admins));
  }

  getEmitters() {
    return new Set(Object.keys(this.emitters));
  }

  getReceivers() {
    let r = new Set();

    this.receivers.snapshot().forEach(
      fp => {
        r.add(this.allReceivers.get(fp));
      }
    );

    return r;
  }

  createAddAdminOp(target, author) {
    var authOp = null;
    if (!author.equals(this.replicable.getCreator())) {
      authOp = this.admins[author.fingeprint()];
    }
    return new ControlOp(this.replicable, author, authOp,
                         ControlOp.ADD_ADMIN, target);
  }

  createAddEmitterOp(target, author) {
    return new ControlOp(this.replicable, author, this.admins[author.fingerprint()],
                         ControlOp.ADD_EMITTER, target);
  }

  createAddReceiverOp(target, author) {
    let auxOp = this.receivers.createAddOp(target.fingerprint());
    if (auxOp !== null) {
      return new ControlOp(this.replicable, author, this.admins[author.fingerprint()],
                           ControlOp.RECEIVER_SET, target,
                           auxOp);
    } else {
      return null;
    }
  }

  createRemoveReceiverOp(target, author) {
    let auxOp = this.receivers.createRemoveOp(target.fingerprint());
    if (auxOp !== null) {
      return new ControlOp(this.replicable, author, this.admins[author.fingerprint()],
                           ControlOp.RECEIVER_SET, target,
                           auxOp);
    } else {
      return null;
    }
  }

  createDataMutationOp(payload, dependencies, author) {
    return new DataOp(this.replicable, author, this.emitters[author.fingerprint()],
                      payload, dependencies);
  }


}

function replicable(Class) {

  const StorableClass = storable(Class);

  return class extends StorableClass {
    constructor(...args) {
      super(...args);
      this.initializeReplicable();
    }

    initializeReplicable() {
      if (this.replicationId === undefined) {
        this.initializeStorable();
        this.replicationId = null;
        this.creator       = null;

        this.control = null;
        this.pending = null;
      }
      this.applyCallback = (op) => this.applyMeta(op);
    }

    // should be called from the replicable class' constructor
    create(identity, replicationId) {

      this.tag(ReplicationService.REPL_OBJECT_TAG);

      this.creator = identity;
      this.addDependency(identity);
      if (replicationId === undefined) {
        this.replicationId = uuid();
      } else {
        this.replicationId = replicationId;
      }

      this.control = new ReplicaControl(this);
      this.pending = [];
      this.signForIdentity(this.creator);

      this.addReceiver(this.creator, this.creator);
    }

    // control operations
    // need to be an owner to invoke

    addAdmin(target, author) {
      this.pending.push(
        this.control.createAddAdminOp(target, author)
      );
    }

    addEmitter(target, author) {
      this.pending.push(
        this.control.createAddEmitterOp(target, author)
      );
    }

    addReceiver(target, author) {
      let op = this.control.createAddReceiverOp(target, author);
      if (op !== null) {
        this.pending.push(op);
      }
    }

    removeReceiver(target, author) {
      let op = this.control.createRemoveReceiverOp(target, author);
      if (op !== null) {
        this.pending.push(op);
      }
    }

    addOperation(payload, dependencies, author) {
      let op = this.control.createDataMutationOp(payload, dependencies, author);
      this.pending.push(op);
    }

    getCreator() {
      return this.creator;
    }

    // I don't think this will ever need to be
    // taken into consideration (its uniqueness
    // is observed through the fingerprint)
    getReplicationId() {
      return this.replicationId;
    }

    getReplicaControl() {
      return this.control;
    }


    applyMeta(op) {
      if (op.isControl()) {
        this.control.apply(op);
      } else {
        this.apply(op);
      }
    }

    flush(store) {

      let promises = [];

      if (this.isUnsaved()) {
        promises.push(store.save(this));
      }

      while (this.pending.length > 0) {
        let op = this.pending.shift();
        promises.push(store.save(op));
      }

      return Promise.all(promises);

    }

    pull(store) {
      return this._pullOnTag(MetaOp.tagFor(this), store);
    }

    sync(store) {
      return this.flush(store).then(this.pull(store));
    }

    subscribe(store) {
      store.registerTagCallback(MetaOp.tagFor(this),
                                this.applyCallback);
    }

    unsubscribe(store) {
      store.deregisterTagCallback(MetaOp.tagFor(this),
                                  this.applyCallback);
    }

    subscribeControl(store) {
      store.registerTagCallback(ControlOp.tagFor(this),
                                this.applyCallback);
    }

    unsubscribeControl(store) {
      store.deregisterTagCallback(ControlOp.tagFor(this),
                                  this.applyCallback);
    }

    pullControl(store) {
      return this._pullOnTag(ControlOp.tagFor(this), store);
    }

    _pullOnTag(tag, store) {

      return store.loadAllByTag(tag).then( ops => {
                      ops.forEach(op => {
                        this.applyMeta(op);
                      });
                    })
                   .then(() => this);
    }

    serialize() {

      let serial = super.serialize();

      serial['creator']        = this.creator.fingerprint();
      serial['replication-id'] = this.replicationId;

      return serial;
    }

    deserialize(serial) {
      this.creator       = this.getDependency(serial['creator']);
      this.replicationId = serial['replication-id'];

      this.control = new ReplicaControl(this);
      this.pending = [];

      super.deserialize(serial);
    }

  }

}

class ReplicationService {


  static SERVICE_NAME = 'replication';

  // The following storage tags allow the ReplicationService
  // to act on replicated objects / operations by observing
  // the Store.

  static REPL_OBJECT_TAG = 'repl-object';

  constructor(peer) {

    this.logger = new Logger(this);
    this.logger.setLevel(Logger.DEBUG());

    this.peer   = peer;
    this.source = null;
    this.store  = peer.getStore();


    this.receivedObjects = new Set();
    this.replicables = {};

    this.shippingStatusStore = new ShippingStatusStore(this.peer.getAccountInstanceFingerprint());

    this.shippers = {};

    this.processNewReplicableBound = this.processNewReplicable.bind(this);
    this.processNewOperationBound = this.processNewOperation.bind(this);

    this.sendObjectBound = this.sendObject.bind(this);
    this.sendAnswerBound = this.sendAnswer.bind(this);

    this.waitForInit = null;

  }

  getServiceName() {
    return ReplicationService.SERVICE_NAME;
  }

  start() {
    this.logger.info('Starting replication service for instance ' + this.peer.getAccountInstanceFingerprint());
    this.waitForInit = this._init().then(() => {
      this.logger.trace('Started replication service for instance ' + this.peer.getAccountInstanceFingerprint() + ', source is ' + this.source.fingerprint());
    });
  }

  async waitUntilStartup() {
    return this.waitForInit;
  }

  async _init() {
    let instance = await this.store.load(this.peer.getAccountInstanceFingerprint());
    this.source = instance.getAccount().getIdentity();

    this.store.registerTagCallback(ReplicationService.REPL_OBJECT_TAG, this.processNewReplicableBound);

    let replicables = await this.store.loadAllByTag(ReplicationService.REPL_OBJECT_TAG);

    for (let replicable of replicables) {
      this.registerReplicable(replicable);
    }

    let dps = await this.shippingStatusStore.loadAll()
    dps.sort((dp1, dp2) => (dp1.timestamp - dp2.timestamp));

    for (let dp of dps) {
      if (this.source.fingerprint() === dp.sourceFP) {

        let destination = await this.store.load(dp.destinationFP);

        let shipper = this._getShipper(destination);
        let p = {}

        p.hash = Pending.generateHash(dp.objectFP, dp.sourceFP, dp.destinationFP);
        p.object = await this.store.load(dp.objectFP);
        p.source = this.source;
        p.destination = destination;
        p.timestamp = p.object.getTimestamp();
        shipper.enque(p);
      }
    }
  }

  registerReplicable(replicable) {
    this.logger.debug('source ' + this.source.fingerprint() + ' is registering replicable ' + replicable.fingerprint())
    this.replicables[replicable.fingerprint()] = replicable;

    replicable.subscribeControl(this.store);
    replicable.pullControl(this.store);

    this.store.registerTagCallback(MetaOp.tagFor(replicable), this.processNewOperationBound);
  }

  processNewReplicable(replicable) {
    this.registerReplicable(replicable);
  }

  processNewOperation(operation) {

    if (this.receivedObjects.has(operation.fingerprint())) {
      this.logger.debug('source ' + this.source.fingerprint() + ' ignoring remote operation ' + operation.fingerprint());
      this.receivedObjects.delete(operation.fingerprint());
    } else {
      this.logger.debug('source ' + this.source.fingerprint() + ' scheduling operation ' + operation.fingerprint() + ' for replication');
      // the object is local, we must ship it.
      operation.getReplicable().getReplicaControl().getReceivers().forEach(
        receiver => {
          let destination = receiver.getRoot();
          if (!this.source.equals(destination)) {
            this.storePendingAndEnque(operation, destination);
          }
        }
      );
      if (operation instanceof ControlOp &&
          operation.getAction() === ControlOp.RECEIVER_SET &&
          OperationalSet.getActionFromOp(operation.getAuxOp()) === 'add') {

        this.store.loadAllByTag(MetaOp.tagFor(operation.getReplicable())).then(
          prevOperations => {

            for (let prevOp of prevOperations) {
              // FIXME: since callbacks are fired _after_ saving an object,
              // the subscription should have added the new receiver by the
              // time the operation that does it triggers the replication hook

              // but that is not happening, so we always do it here

              //if (!prevOp.equals(operation)) {
                console.log('enqueuing PREV operation ' + prevOp.fingerprint() + ' destination:' + operation.getTarget().getRoot().fingerprint());
                try {
                  this.storePendingAndEnque(prevOp, operation.getTarget().getRoot());
                } catch(e) {
                  this.logger.error('could not ship ' + prevOp.fingerprint());
                  console.log(e);
                }

                console.log('enqueued');
              //} else {
              //  console.log('enqueuing PREV operation ' + prevOp.fingerprint() + ' destination:' + operation.getTarget().getRoot().fingerprint());
              //}
            }
          }
        )

      }
    }
  }

  storePendingAndEnque(object, destination) {

    let dp = Pending.dehidrateRecord(object, this.source, destination);
    return this.shippingStatusStore.save(dp).then(() => {


        let shipper = this._getShipper(destination);
        let p = {}

        p.hash = Pending.generateHash(object.fingerprint(), this.source.fingerprint(), destination.fingerprint());
        p.object = object;
        p.source = this.source;
        p.destination = destination;
        p.timestamp = object.getTimestamp();
        shipper.enque(p);
    });
  }

  _getShipper(destination) {
    var shipper = this.shippers[destination.fingerprint()];
    if (shipper === undefined) {
      shipper = new DestinationShippingQueue(destination,
                                             this.replicable,
                                             this.sendObjectBound,
                                             this.sendAnswerBound);
      this.shippers[destination.fingerprint()] = shipper;
    }
    return shipper;
  }


  async receiveMessage(source, destination, service, contents) {

    try {
      if (contents.kind === 'send-object') {
        let objectEnvelope = contents;
        let object = await this.store.load(objectEnvelope.fingerprint, objectEnvelope.dependencies);

        this.logger.debug(destination.fingerprint() + ' is receiving object <' + object.fingerprint() + '> from ' + source.fingerprint());

        if (object.fullContentHash() !== objectEnvelope.hash) {
          this.sendAnswer(destination, source, object.fingerprint(), 'failure', { 'code' : 'hash-mismatch' });
        } else {
          this.receivedObjects.add(objectEnvelope.fingerprint);
          this.store.save(object);
          this.sendAnswer(destination, source, object.fingerprint(), 'success', {});
        }

      } else if(contents.kind === 'send-object-reply') {

        let objectEnvelopeReply = contents;

        this.logger.debug(destination.fingerprint() + ' is receiving reply "' + objectEnvelopeReply.status + '" for ' + objectEnvelopeReply.fingerprint + '> from ' + source.fingerprint());



        if (objectEnvelopeReply.status === 'success') {

          let hash = Pending.generateHash(objectEnvelopeReply.fingerprint,
                                          destination.fingerprint(),
                                          source.fingerprint(),
                                        );

          this.shippingStatusStore.delete(hash);

          if (source.fingerprint() in this.shippers) {
            this.shippers[source.fingerprint()].done(hash);
          }
        }


      }
    } catch (e) {
      this.logger.warning('Error processing received replication message');
      this.logger.warning(e);
      throw e;
    }
  }

  sendObject(source, destination, object) {

    this.logger.debug(source.fingerprint() + ' is shipping object <' + object.fingerprint() + '> to ' + destination.fingerprint());

    let objectEnvelope = new ObjectEnvelope(object);
    this.peer.routeOutgoingMessage(source.fingerprint(), destination.fingerprint(), this.getServiceName(), objectEnvelope);
  }

  sendAnswer(source, destination, fingerprint, status, info) {

    this.logger.debug(source.fingerprint() + ' is sending answer "' + status + '" for object <' + fingerprint + '> to ' + destination.fingerprint());

    let objectEnvelopeReply =
                new ObjectEnvelopeReply(fingerprint,
                                        status,
                                        info);
    this.peer.routeOutgoingMessage(source.fingerprint(), destination.fingerprint(), this.getServiceName(), objectEnvelopeReply);
  }

}

class ObjectEnvelope {
  constructor(object) {
    this.kind = 'send-object';
    if (object !== undefined) {
      this.fingerprint = object.fingerprint();
      this.dependencies    = {};
      this.dependencies[this.fingerprint] = object.serialize();
      object.getAllDependencies().forEach(dep => {
        this.dependencies[dep.fingerprint()] = dep.serialize();
      });
      this.hash = object.fullContentHash();
    } else {
      this.fingerprint  = null;
      this.dependencies = {};
      this.hash         = null;
    }
  }

  serialize() {
    return { 'fingerprint'  :  this.fingerprint,
             'dependencies' :  this.dependencies,
             'hash'         :  this.hash,
             'kind'         :  this.kind };
  }

  deserialize(literal) {
    this.fingerprint  = literal['fingerprint'];
    this.dependencies = literal['dependencies'];
    this.hash         = literal['hash'];
  }
}

class ObjectEnvelopeReply {
  constructor(fingerprint, status, info) {
    this.kind        = 'send-object-reply';
    this.fingerprint = fingerprint === undefined? null : fingerprint;
    this.status      = status === undefined?      null : status;
    this.info        = info === undefined?        null : info;
  }

  serialize() {
    return { 'kind'        : this.kind,
             'fingerprint' : this.fingerprint,
             'status'      : this.status,
             'info'        : this.info };
  }

  deserialize(serial) {
    this.fingerprint = serial['fingerprint'];
    this.status      = serial['status'];
    this.info        = serial['info'];
  }
}

const _RETRANSMISSION_INTERVAL = 10;
const _TICK_INTERVAL           =  1;

class DestinationShippingQueue {

  constructor(destination, replicables, sendObject, sendAnswer) {

    this.logger = new Logger(this);
    this.logger.setLevel(Logger.INFO());

    this.destination = destination;
    this.replicables = replicables;

    this.destinationFP = destination.fingerprint();

    this.sendObject = sendObject;
    this.sendAnswer = sendAnswer;

    this.pending = {};

    this.lastSent = {};

    this.intervalID = null;
    this._tickBound = this._tick.bind(this);
  }

  enque(p) {
    this.pending[p.hash] = p;
    this._send(p);

    if (this.intervalID === null) {
      this.intervalID = setInterval(this._tickBound, _TICK_INTERVAL * 1000);
    }
  }

  done(hash) {

    if (hash in this.pending) {
      delete this.pending[hash];
    }
    if (hash in this.lastSent) {
      delete this.lastSent[hash];
    }

    if (Object.keys(this.pending).length === 0) {
      clearInterval(this.intervalID);
      this.intervalID = null;
    }
  }

  _tick() {
    try {
      this._retransmit();
    } catch(e) {
      this.logger.warning('Error retransmitting object:');
      this.logger.warning(e);
    }
  }

  _send(p) {
    this.lastSent[p.hash] = Date.now();
    this.sendObject(p.source, p.destination, p.object);
  }

  _retransmit() {
    for (let p of Object.values(this.pending)) {
      if (!(p.hash in this.lastSent) ||
          Date.now() > this.lastSent[p.hash] + _RETRANSMISSION_INTERVAL * 1000 ) {
        this._send(p);
      }
    }
  }
}

const _PENDING_DELIVERIES_STORE = 'pending-deliveries-store';

/* { hash: hash(object-source-destination),
     object: fp,
     source: fp,
     destination: fp,
     timestamp } */

class Pending {
  static generateHash(objectFP, sourceFP, destinationFP) {
    return Crypto.hash(objectFP + '-' + sourceFP + '-' + destinationFP);
  }

  static dehidrateRecord(object, source, destination) {
    let objectFP      = object.fingerprint();
    let sourceFP      = source.fingerprint();
    let destinationFP = destination.fingerprint();
    let hash          = Pending.generateHash(objectFP, sourceFP, destinationFP);
    let timestamp     = object.getTimestamp();
    return { 'hash' : hash, 'object' : objectFP, 'source' : sourceFP,
             'destination' : destinationFP, 'timestamp' : timestamp };
  }

}

class ShippingStatusStore {

  constructor(instanceFP) {
    this.db = openDB('replication-for-' + instanceFP, 1, {
        upgrade(newdb, oldVersion, newVersion, tx) {
          var objectStatusStore = newdb.createObjectStore(_PENDING_DELIVERIES_STORE, {keyPath: 'hash'});
      }
    });
  }

  save(pending) {
    return this.db.then( (db) => {
              const tx = db.transaction([_PENDING_DELIVERIES_STORE], 'readwrite');
              tx.objectStore(_PENDING_DELIVERIES_STORE).put(pending);
              return tx.done;
            });
  }

  delete(hash) {
    return this.db.then( (db) => {
              const tx = db.transaction([_PENDING_DELIVERIES_STORE], 'readwrite');
              tx.objectStore(_PENDING_DELIVERIES_STORE).delete(hash);
              return tx.done;
            });
  }

  loadAll() {
    let ingestCursor = async () => {

      let result = [];
      var cursor = await this.db.then((db) =>
                          db.transaction([_PENDING_DELIVERIES_STORE], 'readonly')
                            .objectStore(_PENDING_DELIVERIES_STORE)
                            .openCursor());

      while (cursor) {
        let pending = cursor.value;
        result.push(pending);

        cursor = await cursor.continue();
      }

      return result;
    }

    return ingestCursor()

  }
}

export { replicable, ControlOp, DataOp, ReplicationService };
