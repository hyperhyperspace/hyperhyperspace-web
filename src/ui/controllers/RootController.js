
import MessagingService from '../../services/mesh/messaging.js';
import ContactsService from '../../services/people/contacts.js';
import ChatService from '../../services/people/chat.js';
import ConsoleService from '../../services/development/console.js';

import ChatController from './ChatController.js';
import ContactsController from './ContactsController.js';

class RootController {

  constructor(peerManager) {
    this.peerManager = peerManager;
    this.activePeer  = null;

    this.allChats = null;
    this.chat     = null;

    this.peerActivationCallbacks = new Set();
  }

  addPeerActivationCallback(cb) {
    this.peerActivationCallbacks.add(cb);
  }

  removePeerActivationCallback(cb) {
    this.peerActivationCallbacks.remove(cb);
  }

  getPeerManager() {
    return this.peerManager;
  }

  setActivePeer(fingerprint) {
    this.activePeer = this.peerManager.activatePeerForInstance(fingerprint);

    new MessagingService(this.activePeer);
    new ContactsService(this.activePeer);
    new ConsoleService(this.activePeer);
    new ChatService(this.activePeer);

    this.activePeer.start().then(() => {
      this.allChats = new ContactsController(this);
      this.chat     = new ChatController(this);
      this.peerActivationCallbacks.forEach(cb => {
        cb(this.getActivePeer());
      });
    });
    this.allChats = null;
    this.chat     = null;

  }

  getActivePeer() {
    return this.activePeer;
  }

  getContactsController() {
    return this.allChats;
  }

  getChatController() {
    return this.chat;
  }

}

export default RootController;
