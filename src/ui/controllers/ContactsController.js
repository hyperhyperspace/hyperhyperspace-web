import ContactsService from '../../services/people/contacts.js';
import { InviteInfo } from '../../services/people/contacts.js';

class ContactsController {
  constructor(root) {

    this.root = root;
    this.peer = this.root.getActivePeer();
    this.contactsService = this.peer.getService(ContactsService.SERVICE_NAME);

    let stateCallbacksCaller = () => {
      this.stateCallbacks.forEach(callback => callback());
    };

    this.contactsService.addPendingInvitesChangeCallback(
      stateCallbacksCaller
    );

    this.contactsService.addContactsChangeCallback(
      stateCallbacksCaller
    );

    this.stateCallbacks = new Set();
  }

  addStateCallback(callback) {
    this.stateCallbacks.add(callback);
  }

  formatInvite(invite) {
    return {
      id           : invite.fingerprint(),
      receiverName : invite.receiverName,
      token        : InviteInfo.encode(invite.getInviteInfo())
    }
  }

  getPendingInvites() {
    let result = [];

    this.contactsService.getPendingInvites().forEach(
      invite => {
        result.unshift(this.formatInvite(invite));
      });

    return result;
  }

  static nameToUrl(name) {
    return name.trim().toLowerCase().replace(/[ ./,?&]+/, '-');
  }

  formatProfile(profile) {

    var letter = '';
    let normaliz = profile.getIdentity().getParam('name').trim().toUpperCase();
    let url = ContactsController.nameToUrl(profile.getIdentity().getParam('name'));


    if (normaliz.length>0) {
      letter = normaliz.substring(0, 1);
    }

    return {
      id         : profile.getIdentity().fingerprint(),
      name       : profile.getIdentity().getParam('name'),
      nameForUrl : url,
      letter     : letter
    }
  }

  getContacts(filter) {
    let result = {};
    this.contactsService.getContacts().forEach(
      profile => {
        let p = this.formatProfile(profile);
          if (filter === undefined ||
              p.name.toLowerCase().includes(filter.toLowerCase().trim())) {

          var list = result[p.letter];
          if (list === undefined) {
            list = []
            result[p.letter] = list;
          }
          list.push(p);
        }
      }
    );

    for (let list of Object.values(result)) {
      list.sort();
    }

    return result;
  }

  /*filterContacts = (filter) => {
    this.setState({contacts: this.getContacts(filter)});
  }*/

  createInvite = (recipientName) => {
    this.contactsService.createInvite(recipientName);
  }

  cancelInvite = (id) => {
    this.contactsService.cancelInvite(id);
  }

  acceptInvite = (inviteInfo) => {
    this.contactsService.acceptInvite(inviteInfo);
  }

}

export default ContactsController;
