import { OperationalSingleton } from '../operational/singleton.js';
import { replicable } from '../replication.js';
import { Types } from '../types.js';

/* A replicated mutable object reference implementation.
   Users a CRDT singleton set internally and
   the HO _replicated_ type function to integrate
   into the general replication mechanism.
*/

class ReplicatedValueReferenceBase {
  constructor(identity, params) {
    this.type = Types.REPL_VALUE_REF();

    this.initilizeReplicable(params);

    if (identity !== undefined) {
      this.create(identity);
    }

    this.singleton = new OperationalSingleton();
  }

  setValue(value, author) {
    this.addOperation(this.singleton.createSetValueOp(value), [], author);
  }

  getValue() {
    return this.singleton.getValue();
  }

  apply(op) {
    this.singleton.apply(op.getPayload());
  }

  serialize() {
    return {'type' : this.type};
  }

  deserialize(obj) {

  }
}

class ReplicatedObjectReferenceBase {
  constructor(identity, params) {
    this.type = Types.REPL_OBJECT_REF();

    this.initializeReplicable(params);

    if (identity !== undefined) {
      this.create(identity);
    }

    this.object = null;

    this.singleton = new OperationalSingleton();
  }

  setObject(object, author) {
    this.addOperation(this.singleton.createSetValueOp(object.fingerprint()), [object], author);
  }

  getObject() {
    return this.object;
  }

  apply(op) {
    this.singleton.apply(op.getPayload());

    let newObject = op.getDependency(this.singleton.getValue());

    if (newObject !== undefined) {
      this.object = newObject;
    }
  }

  serialize() {
    return {'type' : this.type};
  }

  deserialize(obj) {

  }
}

const ReplicatedValueReference = replicable(ReplicatedValueReferenceBase);
const ReplicatedObjectReference = replicable(ReplicatedObjectReferenceBase);

export { ReplicatedObjectReference, ReplicatedValueReference };
