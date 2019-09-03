import ChatService from '../../services/people/chat.js';
import ContactsService from '../../services/people/contacts';

import AllChatsController from './AllChatsController.js';

import Timestamps from '../../core/util/timestamps.js';

class ChatController {

  constructor(control) {
    this.control = control;
    this.peer = this.control.getActivePeer();
    this.contactsService = this.peer.getService(ContactsService.SERVICE_NAME);
    this.chatService = this.peer.getService(ChatService.SERVICE_NAME);

    this.knownChats = new Set();

    this.counterparts  = {};
    this.conversations = {};

    this.initialized = false;

    this.stateCallbacks = new Set();

    this.chatService.addNewMessageCallback((chat) => {
      this.processChat(chat);
      this.stateCallbacks.forEach(callback => callback());
    });

    let updateContacts = () => {
      this.contactsService.getContacts().forEach( profile => {
        this._checkCounterpart(profile.getIdentity());
      })
    };

    this.contactsService.addContactsChangeCallback(updateContacts);

    updateContacts();
  }

  init(callback) {
    this.chatService.getChats().then(chats => {
      chats.forEach(chat => this.processChat(chat));
      this.initialized = true;
      if (callback !== undefined) {
        callback();
      }
    })
  }

  addStateCallback(callback) {
    this.stateCallbacks.add(callback);
  }

  processChat(chat) {

    if (this.knownChats.has(chat.fingerprint())) {
      return;
    }

    this.knownChats.add(chat.fingerprint());

    let identity = this.chatService.getIdentity();
    var counterpart = null;
    var userIsSender = null;

    if (chat.sender.equals(identity)) {
      userIsSender = true;
      counterpart = chat.recipient;
    } else if (chat.recipient.equals(identity)) {
      userIsSender = false;
      counterpart = chat.sender;
    }

    this._checkCounterpart(counterpart);

    let conversation = this.conversations[counterpart.fingerprint()];

    var time = '-';
    if (chat.timestamp !== null) {

      let date = new Date(Timestamps.parseUniqueTimestamp(chat.timestamp));
      date.setHours(0,0,0,0);
      let nowDate = new Date();
      nowDate.setHours(0,0,0,0);

      let timestamp = new Date(Timestamps.parseUniqueTimestamp(chat.timestamp));

      // if the message is from today, just dispay the time
      if (date.getTime() === nowDate.getTime()) {
        time = timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});//timestamp.getHours() + ':' + timestamp.getMinutes();
      // otherwise, display just the date
      } else {
        time = timestamp.toLocaleDateString();
      }
      //time = date.toLocaleString();
    }

    conversation['messages'].push(
      {
        id: chat.fingerprint(),
        counterpartName: counterpart.getParam('name'),
        userIsSender: userIsSender,
        content: chat.content,
        time: time,
        isSent: true,
        isReceived: true,
        isRead: false
      });

  }

  _checkCounterpart(counterpart) {
    if (!(counterpart.fingerprint() in this.counterparts)) {
      this.counterparts[counterpart.fingerprint()] = counterpart.getParam('name');
      this.conversations[counterpart.fingerprint()] =
        {
          type: 'user-chat',
          counterpartId: counterpart.fingerprint(),
          counterpartName: counterpart.getParam('name'),
          counterpartNameUrl: AllChatsController.nameToUrl(counterpart.getParam('name')),
          counterpartImage: null,
          messages: []
        };
    }
  }

  getChats() {
    let result = {};

    for (let key of Object.keys(this.conversations)) {
      result[key] = Object.assign({}, this.conversations[key]);
      result[key]['messages'] = this.conversations[key]['messages'].slice();
    }

    return result;
  }

  getChatSummary() {
    let summary = Object.keys(this.conversations).map(
      counterpartId => {
        let conversation = this.conversations[counterpartId];
        var lastMessage = null;
        let messages = conversation['messages'];
        if (messages.length > 0) {
          lastMessage = messages[messages.length-1];
        }
        return {
          type: conversation['type'],
          counterpartId: conversation['counterpartId'],
          counterpartName: conversation['counterpartName'],
          counterpartNameUrl: conversation['counterpartNameUrl'],
          counterpartImage: conversation['counterpartImage'],
          lastMessageUserIsSender: lastMessage !== null && lastMessage['userIsSender'],
          lastMessageStatus: lastMessage === null? null :
                              (lastMessage['isRead']? 'read' :
                                (lastMessage['isReceived']? 'received' :
                                  (lastMessage['isSent']? 'sent' : null))),
          lastMessageContent: lastMessage === null? '' : lastMessage['content'],
          lastMessageTime: lastMessage === null? '' : lastMessage['time'],
        }
      });

    return summary;
  }

  sendChat(recipientFingerprint, content) {
    return this.chatService.sendChatMessage(recipientFingerprint, content);
  }


}


export default ChatController;
