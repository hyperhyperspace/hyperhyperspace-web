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
  constructor(identity) {

    if (identity !== undefined) {
      this.setIdentity(identity);
    }

    this.operationalSet = new OperationalSet();
  }

  add(element, dependencies) {
    this.addOperation(this.operationalSet.createAddOp(element), dependencies);
  }

  remove(element) {
    this.addOperation(this.operationalSet.createRemoveOp(element));
  }

  has(element) {
    return this.operationalSet.has(element);
  }

  snapshot() {
    return this.operationalSet.snapshot();
  }

  serialize() {
    return { };
  }

  deserialize(obj) {

  }
}

const ReplicatedSet = replicable(ReplicatedSetBase);

export { ReplicatedSet };
