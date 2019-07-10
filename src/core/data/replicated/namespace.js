import { OperationalSet } from '../operational/set.js';
import { replicable } from '../replication.js';
import { Types } from '../types.js';
import { Crypto } from '../../peer/crypto.js';

/* A namespace that maps strings to replicated data type instances */

/* All the CRDTs used as values for the namespace must share the
   same creator as the namespace itself. */

/* Important: for a CRDT to be usable as a namespace value, its
              fingerprint must be a function of the given repl-id,
              the creator and the type. This makes race conditions
              when defining keys impossible. */


class ReplicatedNamespaceBase {

  constructor(identity, replicationId) {
    this.initializeReplicable();

    this.names = new OperationalSet();
    this.objects = {};
    this.namespace = {};

    this.type = Types.REPL_NAMESPACE();

    if (identity !== undefined) {
        this.create(identity, replicationId);
    }

  }

  set(name, replicable) {
    let rid = this.getReplication(name, replicable.type);

    if (replicable.getReplicationId() !== rid) {
      throw new Error("Can't add name to replicated namespace, expected a repl. id of " + rid + " but got " + replicable.getReplicationId() + " instead.");
    }

    let item = {
                  'name': name,
                  'type': replicable.type,
                  'fingerprint': replicable.fingerprint()
               };

    this.addOperation(this.names.createAddOp(item), [replicable], this.getCreator());
  }

  get(name, type) {
    return this.namespace[name][type];
  }

  get(name) {
    var result;
    let options = this.namespace[name];

    if (Object.keys(options).length > 1) {
      throw new Error('Namespace ' + this.fingeprint() + ' contains more than one value for requested name: ' + name);
    }

    for (let object of options) {
      result = object;
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

    let fingerprint = item['fingerprint'];
    let replicable  = op.getDependency(fingerprint);
    this.objects[fingerprint] = replicable;

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

      this.namespace[name][type] = this.objects['fingerprint'];
    });
  }

  /* name: non empty alphanumeric + dashes + dots nonempty string */
  /* type: to make sense should be a replicable type as defined in the Types file */

  getReplicationIdFor(name, type) {
    let exp = /^[a-z0-9\-.]+$/;

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
