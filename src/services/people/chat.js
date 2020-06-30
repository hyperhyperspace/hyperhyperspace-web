import { Types } from '../../core/data/types.js';
import { storable } from '../../core/data/storage.js';
import { ReplicationService } from '../../core/data/replication.js';

import { Identity } from '../../core/peer/identity.js';

import Logger from '../../core/util/logging';

const MESSAGE_SETS = 'people.messageSets';

class ChatService {

  static SERVICE_NAME = 'chat-service';

  constructor(peer) {

    this.logger = new Logger(this);
    this.logger.setLevel(Logger.INFO());

    this.peer = peer;
    this.store = peer.getStore();

    this.account = null;
    this.messageSets = null;

    this.newMessageCallbacks = null;

    this.peer.registerService(this);

    this.activeInstance = true;

    this.waitForInit = null;
  }

  getServiceName() {
    return ChatService.SERVICE_NAME;
  }

  start() {

    if (this.waitForInit === null) {
      this.logger.info('Starting chat service for instance ' + this.peer.getAccountInstanceFingerprint());
      this.waitForInit = this._init().then(() => {
        this.logger.trace('Started chat service for instance ' + this.peer.getAccountInstanceFingerprint());
      });
    }

    return this.waitForInit;
  }

  waitUntilStartup() {
    return this.waitForInit;
  }

  async _init() {

    await this.peer.getService(ReplicationService.SERVICE_NAME).waitUntilStartup();

    let instance  = await this.store.load(this.peer.getAccountInstanceFingerprint());
    this.account  = instance.getAccount();

    this.account.subscribe(this.store);

    await this.account.pull(this.store);

    let datasets  = this.account.getDatasets();
    let replNamespaceType = Types.REPL_NAMESPACE();
    let identity = this.account.getIdentity();

    datasets.createAndSetInherited(MESSAGE_SETS, replNamespaceType, identity);

    await this.account.flush(this.store);

    this.messageSets           = datasets.get(MESSAGE_SETS);

    this.newMessageCallbacks = new Set();

    await this.messageSets.subscribe(this.store);
    await this.messageSets.pull(this.store);

    this._newMessageCallbackBound = this._newMessageCallback.bind(this);

    this.store.registerTypeCallback(ChatMessage.type, this._newMessageCallbackBound);

  }

  async sendChatMessage(recipientFingerprint, contents) {
    let sender    = this.account.getIdentity();
    let recipient = await this.store.load(recipientFingerprint);

    let chat = new ChatMessage(sender, recipient, contents);

    let setName = 'messages-for-' + recipient.fingerprint();
    var messageSet = this.messageSets.get(setName);
    if (messageSet === undefined) {
      messageSet = this.messageSets.createAndSet(setName, Types.REPL_OBJECT_SET(), sender);
      await this.messageSets.flush(this.store);
      messageSet.addReceiver(recipient, sender);
    }

    messageSet.add(chat, sender);
    await messageSet.flush(this.store);
    return chat;

  }

  getIdentity() {
    return this.account.getIdentity();
  }

  getChats() {
    return this.store.loadAllByType(ChatMessage.type);
  }

  addNewMessageCallback(callback) {
    this.newMessageCallbacks.add(callback);
  }

  _newMessageCallback(message) {
    this.newMessageCallbacks.forEach(callback => callback(message));
  }
}

class ChatMessageBase {

  static type = 'people-chat-message';
  static storableFields = { sender    : Identity,
                            recipient : Identity,
                            content   : Types.literal
  };

  constructor(sender, recipient, content) {

    if (sender !== undefined) {
      this.sender    = sender;
      this.recipient = recipient;
      this.content  = content;
    }
  }
}

const ChatMessage = storable(ChatMessageBase);
Types.registerClass(ChatMessage);

export { ChatMessage };
export default ChatService;
