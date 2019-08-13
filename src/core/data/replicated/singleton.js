import { OperationalSingleton } from '../operational/singleton.js';
import { replicable } from '../replication.js';
import { Types } from '../types.js';

/* A replicated singleton set implementation.
   Users a CRDT singleton set internally and
   the HO _replicated_ type function to integrate
   into the general replication mechanism.
*/

class ReplicatedSingletonBase {
  constructor(identity, params) {
    this.type = Types.REPL_SINGLETON();

    this.initilizeReplicable();
    this.create(identity, params);

    this.singleton = new OperationalSingleton();
  }

  setValue(value, dependencies) {
    this.addOperation(this.singleton.createSetValueOp(value), dependencies);
  }

  getValue() {
    return this.singleton.getValue();
  }

  serialize() {
    return {'identity' : this.identity};
  }

  deserialize(obj) {
    this.identity = obj['identity'];
  }
}

const ReplicatedSingleton = replicable(ReplicatedSingletonBase);

export { ReplicatedSingleton };
