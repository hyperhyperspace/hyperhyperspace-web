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
  constructor(identity, params) {
    this.type = Types.REPL_SET();

    this.initializeReplicable(params);

    this.operationalSet = new OperationalSet();


    if (identity !== undefined) {
      this.create(identity);
    }
  }

  add(element, author) {
    let op = this.operationalSet.createAddOp(element);
    if (op !== null) {
      this.addOperation(op, [], author);
    }

  }

  remove(element, author) {
    let op = this.operationalSet.createRemoveOp(element);
    if (op !== null) {
      this.addOperation(op, [], author);
    }

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
  constructor(identity, params) {
    this.type = Types.REPL_OBJECT_SET();

    this.initializeReplicable(params);
    this.operationalSet = new OperationalSet();
    this.objects = {};

    if (identity !== undefined) {
      this.create(identity);
    }
  }

  add(storable, author) {
    let op = this.operationalSet.createAddOp(storable.fingerprint());
    if (op !== null) {
      this.addOperation(op, [storable], author);
    }
  }

  remove(storable, author) {
    let op = this.operationalSet.createRemoveOp(storable.fingerprint());
    if (op !== null) {
      this.addOperation(op, [], author);
    }

  }

  removeFingerprint(fingerprint, author) {
    this.addOperation(this.operationalSet.createRemoveOp(fingerprint), [], author);
  }

  apply(op) {
    let fingerprint = OperationalSet.getElementFromOp(op.getPayload());
    let storable    = op.getDependency(fingerprint);
    this.operationalSet.apply(op.getPayload());
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
        objectSet.add(this.objects[fingerprint]);
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
