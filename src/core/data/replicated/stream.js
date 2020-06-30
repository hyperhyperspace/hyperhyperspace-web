import { replicable } from '../replication.js';
import { Types } from '../types.js';

class ReplicatedObjectStreamBase {
  constructor(identity, params) {
    this.type = Types.REPL_OBJECT_STREAM;

    this.initializeReplicable(params);

    if (identity !== undefined) {
      this.create(identity);
    }
  }

  emit(storable, author) {
    this.addOperation(storable.fingerprint(), [storable], author);
  }

  apply(op) {
    // do nothing
  }

  serialize() {
    return { 'type': this.type};
  }

  deserialize(obj) {

  }
}

const ReplicatedObjectStream = replicable(ReplicatedObjectStreamBase);

export { ReplicatedObjectStream } ;
