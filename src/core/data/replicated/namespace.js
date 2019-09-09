import { OperationalSet } from '../operational/set.js';
import { replicable } from '../replication.js';
import { Types } from '../types.js';
import { Crypto } from '../../peer/crypto.js';

/* A namespace CRDT that maps strings to replicated data type instances */

/* All the CRDTs used as values for the namespace must share the
   same creator as the namespace itself. */

/* Important: for a CRDT to be usable as a namespace value, its
              fingerprint must be a function of the given repl-id,
              the creator and the type. This makes race conditions
              when defining keys impossible. */

/* it's like multiplexing a previously-agreed upon replication-id,
   and using it to send operations to several CRDT. */


class ReplicatedNamespaceBase {

  constructor(identity, params) {

    this.type = Types.REPL_NAMESPACE();

    this.initializeReplicable(params);

    this.names = new OperationalSet();
    this.objects = {};
    this.namespace = {};

    if (identity !== undefined) {
      this.create(identity);
    }

  }

  set(name, replicable) {
    let rid = this.getReplicationIdFor(name, replicable.type);

    if (replicable.getReplicationId() !== rid) {
      throw new Error("Can't add name to replicated namespace, expected a repl. id of " + rid + " but got " + replicable.getReplicationId() + " instead.");
    }

    let item = {
                  'name': name,
                  'type': replicable.type,
                  'fingerprint': replicable.fingerprint()
               };


    let op = this.names.createAddOp(item);
    if (op !== null) {
      this.addOperation(op, [replicable], this.getCreator());
    }
  }

/*
  createAndSet(name, containerTypeName, creatorIdentity, params) {
    return this.createAndSetInherited(name, containerTypeName, creatorIdentity, null);
  }*/

  createAndSetInherited(name, containerTypeName, creatorIdentity, params) {
    if (params === undefined) {
      params = {};
    }

    params['parentReplicable'] = this;

    return this.createAndSet(name, containerTypeName, creatorIdentity, params);
  }

  createAndSet(name, containerTypeName, creatorIdentity, params) {

    if (name in this.namespace && containerTypeName in this.namespace[name]) {
      return;
    }

    let replId = this.getReplicationIdFor(name, containerTypeName);
    let constr = Types.constructorForType(containerTypeName);

    if (params === undefined) {
      params = {};
    }

    params['replicationId'] = replId;

    let container = new constr(creatorIdentity, params);
    this.set(name, container);
    return container;
  }

  get(name, type) {

    if (type !== undefined) {
      return this.namespace[name][type];
    }

    var result = undefined;
    let options = this.namespace[name];

    if (options !== undefined) {
      if (Object.keys(options).length > 1) {
        throw new Error('Namespace ' + this.fingeprint() + ' contains more than one value for requested name: ' + name);
      }

      for (let object of Object.values(options)) {
        result = object;
      }
    }

    return result;
  }

  has(name) {
    return name in this.namespace;
  }

  /* assumes no type conflicts */
  snapshot() {
    let result = {};

    for (let name of this.getAllNames()) {
      result[name] = this.get(name);
    }

  }

  getAllNames() {
    return Object.keys(this.namespace);
  }

  apply(op) {
    let item = OperationalSet.getElementFromOp(op.getPayload());

    this.names.apply(op.getPayload());

    let fingerprint = item['fingerprint'];
    let replicable  = op.getDependency(fingerprint);

    // if an object was already loaded, we don't
    // replace it with an 'empty' freshly loaded
    // version, since it would break idempotence, etc.
    if (!(fingerprint in this.objects)) {
      this.objects[fingerprint] = replicable;
    }


    this._recreateNamespace();
  }

  _recreateNamespace() {
    this.namespace = {};
    this.names.snapshot().forEach(item => {
      let fingerprint = item['fingerprint'];
      let name        = item['name'];
      let type        = item['type'];

      if (!(name in this.namespace)) {
        this.namespace[name] = {};
      }

      this.namespace[name][type] = this.objects[fingerprint];
    });
  }

  _applyOnAllObjects(f) {
    let promises = [];
    for (let typedObjects of Object.values(this.namespace)) {
      for (let object of Object.values(typedObjects)) {
        promises.push(f(object));
      }
    }
    return Promise.all(promises);
  }

  flushContents(store) {
    return this._applyOnAllObjects(o => o.flush(store));
  }

  pullContents(store) {
    return this._applyOnAllObjects(o => o.pull(store));
  }

  subscribeContents(store) {
    return this._applyOnAllObjects(o => o.subscribe(store));
  }

  unsubscribeContents(store) {
    return this._applyOnAllObjects(o => o.unusbscribe(store));
  }


  /* name: non empty alphanumeric + dashes + dots nonempty string */
  /* type: to make sense should be a replicable type as defined in the Types file */

  getReplicationIdFor(name, type) {
    let exp = /^[a-zA-Z0-9\-.]+$/;

    if (!exp.test(name)) {
      throw new Error('Replicable namespace names must be non-empty alphanumeric + dashes + dots strings, received "' + name + '"');
    }

    return Crypto.hash(this.getReplicationId() + '//' + name + '//' + type);
  }

  serialize() {
    return { 'type' : this.type };
  }

  deserialize(serial) {

  }


}

const ReplicatedNamespace = replicable(ReplicatedNamespaceBase);

export { ReplicatedNamespace };
