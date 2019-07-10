import { OperationalSet } from '../operational/set.js';
import { replicable } from '../replication.js';
import { Types } from '../types.js';


/* A replicated set implementation. Uses a CRDT set
   internally to generate and apply operations, and
   the HO _replicated_ type function to integrate
   into the general replication mechanism for
   operational data types implemented within h.h.s.
*/

class ReplicatedSetBase {
  constructor(identity, replicationId) {
    this.initializeReplicable();

    this.operationalSet = new OperationalSet();
    this.type = Types.REPL_SET();

    if (identity !== undefined) {
      this.create(identity, replicationId);
    }
  }

  add(element, author) {
    this.addOperation(this.operationalSet.createAddOp(element), [], author);
  }

  remove(element, author) {
    this.addOperation(this.operationalSet.createRemoveOp(element), [], author);
  }

  apply(op) {
    this.operationalSet.apply(op.getPayload());
  }

  has(element) {
    return this.operationalSet.has(element);
  }

  snapshot() {
    return this.operationalSet.snapshot();
  }

  serialize() {
    return { 'type': this.type};
  }

  deserialize(obj) {

  }
}

const ReplicatedSet = replicable(ReplicatedSetBase);

class ReplicatedObjectSetBase {
  constructor(identity, replicationId) {

    this.initializeReplicable();
    this.operationalSet = new OperationalSet();
    this.objects = {};
    this.type = Types.REPL_OBJECT_SET();

    if (identity !== undefined) {
      this.create(identity, replicationId);
    }
  }

  add(storable, author) {
    this.addOperation(this.operationalSet.createAddOp(storable.fingerprint()), [storable], author);
  }

  remove(storable, author) {
    this.addOperation(this.operationalSet.createRemoveOp(storable.fingerprint()), [], author);
  }

  removeFingarprint(fingerprint, author) {
    this.addOperation(this.operationalSet.createRemoveOp(fingerprint), [], author);
  }

  apply(op) {
    let fingerprint = OperationalSet.getElementFromOp(op.getPayload());
    let storable    = op.getDependency(fingerprint);
    if (storable !== undefined) { this.objects[fingerprint] = storable };
  }

  has(storable) {
    return this.operationalSet.has(storable.fingerprint());
  }

  hasFingerprint(fp) {
    return this.operationalSet.has(fp);
  }

  snapshot() {
    let objectSet = new Set();
    this.operationalSet.snapshot().forEach(
      (fingerprint) => {
        objectSet.add(this.objects.get(fingerprint));
      }
    );

    return objectSet;
  }

  fingerprintSnapshot() {
    return this.operationalSet.snapshot();
  }

  serialize() {
    return { 'type': this.type };
  }

  deserialize(obj) {

  }
}

const ReplicatedObjectSet = replicable(ReplicatedObjectSetBase);


export { ReplicatedSet, ReplicatedObjectSet };
