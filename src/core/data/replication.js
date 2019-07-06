import { v4 as uuid } from 'uuid';
import { Identity, IdentityKey } from '../peer/crypto.js';
import { storable } from './storage.js';
import { OperationalSet } from './operational/set.js';

class MetaOp {

  static tagFor(replicable) {
    return 'repl-op-for-' + replicable.fingerprint();
  }

  constructor(replicable, author, authOp, payload) {
    this.replicable = replicable === undefined? null : replicable;
    this.author     = author === undefined?     null : author;
    this.authOp     = authOp === undefined?     null : authOp;
    this.payload    = payload === undefined?    null : payload;

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

  serialize() {
    return {
      'replicable': this.replicable.fingerprint(),
      'author'    : this.author.fingerprint(),
      'authOp'    : this.authOp.fingerprint(),
      'payload'   : this.payload
    };
  }

  deserialize(serial) {
    this.replicable = this.getDependency(serial['replicable']);
    this.author     = this.getDependency(serial['author']);
    this.authOp     = this.getDependency(serial['authOp']);
    this.payload    = serial['payload'];
  }

}

class DataOpBase extends MetaOp {

  constructor(replicable, author, authOp, payload) {
    super(replicable, author, authOp, payload);
    this.signWith(author.getIdentityKey());
  }

  isControl() {
    return false;
  }

  verify() {
    return
      this.authOp !== null &&
      this.replicable.equals(this.authOp.getReplicable()) &&
      this.authOp.verify() &&
      this.authOp.getAction() === ControlOp.ADD_EMITTER &&
      this.authOp.getTarget().equals(this.getAuthor()) &&
      this.isSignedBy(this.getAuthor());
  }

}

class ControlOpBase extends MetaOp {

  static ADD_CREATOR  = 'add-creator';
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
      this.action = action;
      this.target = target;
      this.addDependency(target);
      this.auxOp = auxOp === undefined? null : auxOp;
      payload = {'action': action, 'target': target.fingerprint()};
      if (auxOp !== undefined) {
        payload['op'] = auxOp;
      }
    }

    super(replicable, author, authOp, payload);

    if (replicable !== undefined) {
      this.tag(ControlOp.tagFor(replicable));
    }

    if (author !== undefined) this.signWith(author.getIdentityKey());
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
           this.verifyAuthOp() && (
              this.verifyCreator()     ||
              this.verifyAddAdmin()    ||
              this.verifyAddEmitter()  ||
              this.verifyReceiverSet()
            );


  }

  verifyAuthorSignature() {
    return this.isSignedBy(this.author);
  }

  verifyAuthOp() {
    if (this.action === ControlOp.ADD_CREATOR) {
      return this.authOp === null;
    } else {
      return this.authOp !== null &&
             this.authOp.replicable.equals(this.replicable) &&
             this.authOp.verify() &&
             this.authOp.target.equals(this.author);
    }
  }

  verifyCreator() {
    return this.action === ControlOp.ADD_CREATOR &&
           this.author.equals(this.replicable.getCreator()) &&
           this.target.equals(this.author);
  }

  verifyAdminAuthOp() {
    return this.authOp.action === ControlOp.ADD_CREATOR ||
           this.authOp.action === ControlOp.ADD_ADMIN;
  }

  verifyAddAdmin() {
    return this.verifyAdminAuthOp() &&
           this.action === ControlOp.ADD_ADMIN;
  }

  verifyAddEmitter() {
    return this.verifyAdminAuthOp() &&
           this.action === ControlOp.ADD_EMITTER;
  }

  verifyReceiverSet() {
    return this.verifyAdminAuthOp() &&
           this.action === ControlOp.RECEIVER_SET &&
           this.target.fingerprint() === this.auxOp['element'];
  }

  deserialize(serial) {
    super.deserialize(serial);
    this.action = this.payload['action'];
    this.target = this.getDependency(this.payload['target']);
    this.auxOp  = 'op' in this.payload? this.payload['op'] : null;
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

    if (replicable !== undefined) {
      this.replicable = replicable;
      this.addDependency(replicable);
    }
  }

  apply(op) {
    if (op.isControl() && op.verify()) {
      let action = op.getAction();
      let target = op.getTarget();
      if (action === ControlOp.ADD_CREATOR ||
          action === ControlOp.ADD_ADMIN) {
            this.admins[target.fingerprint()] = op;
      } else if (action === ControlOp.ADD_EMITTER) {
        this.emitters[target.fingerprint()] = op;
      } else if (action === ControlOp.RECEIVER_SET){
        this.receivers.applyOp(op.getAuxOp());
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
    return this.receivers.snapshot();
  }

  createAddCreatorOp(author) {
    return new ControlOp(this.replicable, author, null, ControlOp.ADD_CREATOR, author);
  }

  createAddAdminOp(target, author) {
    return new ControlOp(this.replicable, author, this.admins[author.fingeprint()],
                         ControlOp.ADD_ADMIN, target);
  }

  createAddEmitterOp(target, author) {
    return new ControlOp(this.replicable, author, this.admins[author.fingerprint()],
                         ControlOp.ADD_EMITTER, target);
  }

  createAddReceiverOp(target, author) {
    return new ControlOp(this.replicable, author, this.admins[author.fingerprint()],
                         ControlOp.RECEIVER_SET, target,
                         this.receivers.createAddOp(target.fingerprint()));
  }

  createRemoveReceiverOp(target, author) {
    return new ControlOp(this.replicable, author, this.admins[author.fingerprint()],
                         ControlOp.RECEIVER_SET, target,
                         this.receivers.createRemoveOp(target.fingerprint()));
  }

  createDataMutationOp(payload, author) {
    return new DataOp(this.replicable, author, this.emitters[author.fingerprint()],
                      payload);
  }


}

function replicable(Class) {

  const StorableClass = storable(Class);

  return class extends StorableClass {
    constructor(...args) {
      super(...args);
      this.creator  = null;
      this.uuid     = null;

      this.control = null;
      this.pending = null;
      this.applyCallback = (op) => this.applyMeta(op);
    }

    // should be called from the replicable class' constructor
    create(identity) {
      this.tag(ReplicationService.REPL_OBJECT_TAG);

      this.creator = identity;
      this.addDependency(identity);
      this.uuid    = uuid();

      this.control = new ReplicaControl(this);
      this.pending.push(this.control.createAddCreatorOp(this.creator));
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
      this.pending.push(
        this.control.createAddReceiverOp(target, author)
      );
    }

    removeReceiver(target, author) {
      this.pending.push(
        this.control.createRemoveReceiverOp(target, author)
      );
    }

    addOperation(payload, dependencies, author) {
      let op = this.control.createDataMutationOp(payload, author);
      dependencies.forEach(dep => {
        op.addDependency(dep);
      });
      this.pending.push(op);
    }

    getCreator() {
      return this.creator;
    }

    // I don't think this will ever need to be
    // taken into consideration (its uniqueness
    // is observed through the fingerprint)
    getUUID() {
      return this.uuid;
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

      while (this.pending.size > 0) {
        let op = this.pending.shift();
        promises.push(store.save(op));
      }

      return Promise.all(promises);

    }

    pull(store) {
      return this.pullOnTag(MetaOp.tagFor(this));
    }

    sync(store) {
      return this.flush(store).then(this.pull(store));
    }

    subscribe(store) {
      store.registerCallback(MetaOp.tagFor(this),
                             this.applyCallback);
    }

    unsubscribe(store) {
      store.deregisterCallback(MetaOp.tagFor(this),
                             this.applyCallback);
    }

    pullControl(store) {
      return this.pullOnTag(ControlOp.tagFor(this));
    }

    _pullOnTag(tag, store) {
      return store.loadAllByTag(tag).then( ops => {
            ops.forEach(op => {
              this.applyMeta(op);
            });
          });
    }

    serialize() {
      return {
        'creator': this.creator.fingerprint(),
        'uuid':    this.uuid
      };
    }

    deserialize(serial) {
      this.creator = this.getDependency(serial['creator']);
      this.uuid    = serial['uuid'];

      this.control = new ReplicaControl(this);
      this.pending = [];
    }

  }

}

class ReplicationService {
  // The following storage tags allow the ReplicationService
  // to act on replicated objects / operations by observing
  // the Store.

  static REPL_OBJECT_TAG = 'repl-object';
}

class ReplicationManager {

}

export { replicable, ControlOp, DataOp, ReplicationManager };
