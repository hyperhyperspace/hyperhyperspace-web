import IdentityKey from '../peer/identity.js';
import { SyncLocation, SyncElement } from './sync.js';

const _ACCOUNT       = 'account';
const _IDENTITY_KEY  = 'identity-key';
const _SYNC_LOCATION = 'sync-location';
const _SYNC_ELEMENT  = 'sync-element';


class Types {
  static IDENTITY_KEY()  { return _IDENTITY_KEY; }
  static SYNC_LOCATION() { return _SYNC_LOCATION; }
  static SYNC_ELEMENT()  { return _SYNC_ELEMENT; }

  static deserializeWithType(literal) {

    var typed = null;

    if (literal.type !== undefined) {
      if (literal.type === _IDENTITY_KEY) {
        typed = new IdentityKey();
      } else if (literal.type === _SYNC_LOCATION) {
        typed = new SyncLocation();
      } else if (literal.type === _SYNC_ELEMENT) {
        typed = new SyncElement();
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
