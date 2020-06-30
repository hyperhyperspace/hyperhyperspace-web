import { StorableValue } from './storage.js';
import { Identity, IdentityKey } from '../peer/identity.js';
import { ControlOp, DataOp } from './replication.js';
import { ReplicatedSet, ReplicatedObjectSet } from './replicated/set.js';
import { ReplicatedValueReference, ReplicatedObjectReference } from './replicated/reference.js';
import { ReplicatedNamespace } from './replicated/namespace.js';
import { ReplicatedObjectStream } from './replicated/stream.js';

const _STORABLE_VALUE     = 'storable-value';
const _IDENTITY           = 'identity';
const _IDENTITY_KEY       = 'identity-key';
const _DATA_OP            = 'data-op';
const _CONTROL_OP         = 'control-op';
const _REPL_SET           = 'repl-set';
const _REPL_OBJECT_SET    = 'repl-object-set';
const _REPL_VALUE_REF     = 'repl-value-reference';
const _REPL_OBJECT_REF    = 'repl-object-reference';
const _REPL_NAMESPACE     = 'repl-namespace';
const _REPL_OBJECT_STREAM = 'repl-object-stream';

class Types {

  static classes = {};

  static registerClass(theclass) {
    Types.classes[theclass.type] = theclass;
  }

  // core system
  static STORABLE_VALUE()     { return _STORABLE_VALUE; }
  static IDENTITY()           { return _IDENTITY; }
  static IDENTITY_KEY()       { return _IDENTITY_KEY; }
  static DATA_OP()            { return _DATA_OP; }
  static CONTROL_OP()         { return _CONTROL_OP; }
  static REPL_OBJECT_SET()    { return _REPL_OBJECT_SET; }
  static REPL_SET()           { return _REPL_SET; }
  static REPL_VALUE_REF()     { return _REPL_VALUE_REF; }
  static REPL_OBJECT_REF()    { return _REPL_OBJECT_REF; }
  static REPL_NAMESPACE()     { return _REPL_NAMESPACE; }
  static REPL_OBJECT_STREAM() { return _REPL_OBJECT_STREAM; }

  static literal = 'native-literal';


  static classForType(type) {
    var result = null;

    if (Types.classes[type] !== undefined) {
      return Types.classes[type];
    }

    if (type === _STORABLE_VALUE) {
      result = StorableValue;
    } else if (type === _IDENTITY_KEY) {
      result = IdentityKey;
    } else if (type === _IDENTITY) {
      result = Identity;
    } else if (type === _REPL_SET) {
      result = ReplicatedSet;
    } else if (type === _REPL_OBJECT_SET) {
      result = ReplicatedObjectSet;
    } else if (type === _REPL_VALUE_REF) {
      result = ReplicatedValueReference;
    } else if (type === _REPL_OBJECT_REF) {
      result = ReplicatedObjectReference;
    } else if (type === _DATA_OP) {
      result = DataOp;
    } else if (type === _CONTROL_OP) {
      result = ControlOp;
    } else if (type === _REPL_NAMESPACE) {
      result = ReplicatedNamespace;
    } else if (type === _REPL_OBJECT_STREAM) {
      result = ReplicatedObjectStream;
    }

    return result;
  }

  static deserializeWithType(serial, deps, foundKeys) {

    var typed = null;

    if (deps === undefined) deps = {};
    if (foundKeys === undefined) foundKeys = {};

    // create object of correct type
    if (serial.type !== undefined) {
      let constr = Types.classForType(serial.type);

      if (constr !== null) {
        typed = new constr();
      } else {
        throw new Error("Unknown object type '" + serial.type + "'");
      }

      // load received dependencies into typed object before deserialization
      for (let obj of Object.values(deps)) {
        typed.setDependency(obj);
      }

      for (let key of Object.values(foundKeys)) {
        typed.addKey(key);
      }

      typed.deserialize(serial);
      return typed;
    } else {
      console.log('missing type from:');
      console.log(serial);
      throw new Error('Object type information is missing');
    }
  }

}

export { Types };
