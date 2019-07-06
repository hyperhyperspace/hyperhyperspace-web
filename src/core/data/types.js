import { Identity, IdentityKey } from '../peer/identity.js';
import { Account, AccountInstance } from '../peer/accounts.js';
import { ControlOp, DataOp } from './replication.js';
import { ReplicatedSet } from './replicated/set.js';
import { ReplicatedSingleton } from './replicated/singleton.js';

const _ACCOUNT          = 'account';
const _ACCOUNT_INSTANCE = 'account-instance';
const _IDENTITY         = 'identity';
const _IDENTITY_KEY     = 'identity-key';
const _DATA_OP          = 'data-op';
const _CONTROL_OP       = 'control-op';
const _REPL_SET         = 'repl-set';
const _REPL_SINGLETON   = 'repl-singleton';

class Types {
  static ACCOUNT()         { return _ACCOUNT; }
  static ACCOUNT_INSTANCE() { return _ACCOUNT_INSTANCE; }
  static IDENTITY()        { return _IDENTITY; }
  static IDENTITY_KEY()    { return _IDENTITY_KEY; }
  static DATA_OP()         { return _DATA_OP; }
  static CONTROL_OP()      { return _CONTROL_OP; }
  static REPL_SET()        { return _REPL_SET; }
  static REPL_SINGLETON()  { return _REPL_SINGLETON; }

  static deserializeWithType(serial, deps, foundKeys) {

    var typed = null;

    // create object of correct type
    if (serial.type !== undefined) {
      if (serial.type === _IDENTITY_KEY) {
        typed = new IdentityKey();
      } else if (serial.type === _IDENTITY) {
        typed = new Identity();
      } else if (serial.type === _ACCOUNT) {
        typed = new Account();
      } else if (serial.type === _ACCOUNT_INSTANCE) {
        typed = new AccountInstance();
      } else if (serial.type === _REPL_SET) {
        typed = new ReplicatedSet();
      } else if (serial.type === _REPL_SINGLETON) {
        typed = new ReplicatedSingleton();
      } else if (serial.type === _DATA_OP) {
        typed = new DataOp();
      } else if (serial.type === _CONTROL_OP) {
        typed = new ControlOp();
      } else {
        throw new Error("Unknown object type '" + serial.type + "'");
      }

      // load received dependencies into typed object before deserialization
      for (let obj of Object.values(deps)) {
        typed.setDependency(obj);
      }

      foundKeys.forEach(key => {
        typed.addKey(key);
      });

      typed.deserialize(serial);
      return typed;
    } else {
      throw new Error('Object type information is missing');
    }
  }

}

export { Types };
