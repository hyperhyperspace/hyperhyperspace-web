import IdentityKey from '../peer/identity.js';
import { SyncLocation } from './sync.js';
import { SyncSet, SyncSetOp } from './collections/set.js';
const _ACCOUNT       = 'account';
const _IDENTITY_KEY  = 'identity-key';
const _SYNC_LOCATION = 'sync-location';
const _SYNC_SET      = 'sync-set';
const _SYNC_SET_OP   = 'sync-set-op';


class Types {
  static IDENTITY_KEY()  { return _IDENTITY_KEY; }
  static SYNC_LOCATION() { return _SYNC_LOCATION; }
  static SYNC_SET()      { return _SYNC_SET; }
  static SYNC_SET_OP()   { return _SYNC_SET_OP; }

  static deserializeWithType(literal) {

    var typed = null;

    if (literal.type !== undefined) {
      if (literal.type === _IDENTITY_KEY) {
        typed = new IdentityKey();
      } else if (literal.type === _SYNC_LOCATION) {
        typed = new SyncLocation();
      } else if (literal.type === _SYNC_SET) {
        typed = new SyncSet();
      } else if (literal.type === _SYNC_SET_OP) {
        typed = new SyncSetOp();
      } else {
        throw new Error("Unknown object type '" + literal.type + "'");
      }

      typed.deserialize(literal);
      return typed;
    } else {
      throw new Error('Object type information is missing');
    }
  }

}

export { Types };
