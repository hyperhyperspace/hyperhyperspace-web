import { Types } from '../../core/data/types.js';
import { storable } from '../../core/data/storage.js';
import { ReplicationService } from '../../core/data/replication.js';

import { ReplicatedNamespace } from '../../core/data/replicated/namespace.js';

import Strings    from '../../core/util/strings.js';
import { Crypto } from '../../core/peer/crypto.js';

import MessagingService from '../mesh/messaging.js';

import Logger from '../../core/util/logging';

/******************************************************

A: sends contact request
B: receives conctact request

1. A packs:  - his acct identity,
             - his info (must match identity),
             - a working linkup host,
             - a random secret

into an URL that can be send out-of-band and opened in
the hyperhyper.space website.

At the same time, A stores the random secret along of
a note of to whom the invite was sent to, to compare
later.

2. B opens URL and owner decides if he wants to
   accept contact or not

3.1 To reject contact request, B sends a message over
    to A rejecting invitation for the received shared
    secret. The end.
3.2 To ignore a contact request, B does nothing. The end.
3.3 To accept a contact request, B packs:

    - his acct info,
    - the received random secret

    and sends this information to A.

4. A checks the received random secret against the
   stored secrets and adds the account to the list
   of known contacts if it matches any, also
   informing the owner who can invalidate the action
   if the received account's information is not what
   he expected. Finally he sends his own account
   information to B so he can do the same.

5. B checks that the received account has the same
   identity and name as in the original URL packed
   info, and finally adds A's info to the list of
   known accounts.

*******************************************************/


const PROFILE                    = 'people.profile';
const CONTACTS_SET               = 'people.contacts';
const PENDING_INVITES_SET        = 'people.pendingInvites';
const PENDING_INVITE_REPLIES_SET = 'people.pendingInviteReplies';

class ContactsService {

  static SERVICE_NAME = 'contacts';

  constructor(peer) {

    this.logger = new Logger(this);
    this.logger.setLevel(Logger.INFO());

    this.peer  = peer;
    this.store = peer.getStore();

    this.account = null;
    this.contacts = null;
    this.pendingInvites       = null;
    this.pendingInviteReplies = null;

    this.pendingInvitesChangeCallbacks = null;
    this.contactsChangeCallbacks       = null;

    this.peer.registerService(this);

    this.activeInstance = true;

    this.waitForInit = null;
  }

  getServiceName() {
    return ContactsService.SERVICE_NAME;
  }

  start() {

    if (this.waitForInit === null) {
      this.logger.info('Starting contacts service for instance ' + this.peer.getAccountInstanceFingerprint());
      this.waitForInit = this._init().then(() => {
        this.logger.trace('Started contacts service for instance ' + this.peer.getAccountInstanceFingerprint());
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
    let replObjSetType = Types.REPL_OBJECT_SET();
    let replNamespaceType = Types.REPL_NAMESPACE();
    let replObjectReferenceType = Types.REPL_OBJECT_REF();
    let identity = this.account.getIdentity();


    datasets.createAndSet(PROFILE, replObjectReferenceType, identity);
    datasets.createAndSetInherited(CONTACTS_SET, replObjSetType, identity);
    datasets.createAndSetInherited(PENDING_INVITES_SET, replObjSetType, identity);
    datasets.createAndSetInherited(PENDING_INVITE_REPLIES_SET, replObjSetType, identity);

    await this.account.flush(this.store);

    this.profileRef            = datasets.get(PROFILE);
    this.contacts              = datasets.get(CONTACTS_SET);
    this.pendingInvites        = datasets.get(PENDING_INVITES_SET);
    this.pendingInviteReplies  = datasets.get(PENDING_INVITE_REPLIES_SET);

    this.pendingInvitesChangeCallbacks = new Set();
    this.contactsChangeCallbacks       = new Set();

    await Promise.all([this.profileRef.subscribe(this.store),
                       this.contacts.subscribe(this.store),
                       this.pendingInvites.subscribe(this.store),
                       this.pendingInviteReplies.subscribe(this.store)]);

    await Promise.all([this.profileRef.pull(this.store),
                       this.contacts.pull(this.store),
                       this.pendingInvites.pull(this.store),
                       this.pendingInviteReplies.pull(this.store)]);

    if (this.profileRef.getObject() === null) {
      let profile = new Profile(this.account.getIdentity());
      this.profileRef.setObject(profile, this.account.getIdentity());
      this.profileRef.flush(this.store);
    }

    this._newProfileCallbackBound = this._newProfileCallback.bind(this);

    this.store.registerTypeCallback(Types.PROFILE(), this._newProfileCallbackBound);

    await this.pendingInviteReplies.pull(this.store);

    this.pendingInviteReplies.snapshot().forEach(inviteReply => {
      this._processInviteReply(inviteReply);
    });

    this.pendingInvites.addDataCallback(() => {
      this.pendingInvitesChangeCallbacks.forEach(callback => callback());
    });

    this.contacts.addDataCallback(() => {
      this.contactsChangeCallbacks.forEach(callback => callback());
    });

  }

  getContacts() {
    return this.contacts.snapshot();
  }

  getPendingInvites() {
    return this.pendingInvites.snapshot();
  }

  getPendingInviteReplies() {
    return this.pendingInviteReplies.snapshot();
  }

  createInvite(receiverName) {

    this.logger.debug(this.account.getIdentity().fingerprint() + ' is creating invite for ' + receiverName);

    let sender  = this.account.getIdentity();
    let linkups = Array.from(this.account.getAllLinkupServers());
    let invite  = new Invite(sender, receiverName, linkups);

    this.pendingInvites.add(invite, sender);
    this.pendingInvites.flush(this.store);
    return invite;
  }

  cancelInvite(fingerprint) {
    this.pendingInvites.removeFingerprint(fingerprint, this.account.getIdentity());
    this.pendingInvites.flush(this.store);
  }

  acceptInvite(inviteInfo) {
    let receiver = this.account.getIdentity();
    let linkups  = Array.from(this.account.getAllLinkupServers());
    let inviteReply = new InviteReply(inviteInfo, receiver, linkups);

    this.pendingInviteReplies.add(inviteReply, receiver);
    this.pendingInviteReplies.flush(this.store).then(() => {
      this._processInviteReply(inviteReply);
    });
  }

  addPendingInvitesChangeCallback(callback) {
    this.pendingInvitesChangeCallbacks.add(callback);
  }

  addContactsChangeCallback(callback) {
    this.contactsChangeCallbacks.add(callback);
  }

  _newProfileCallback(profile) {

    if (profile.getIdentity().equals(this.account.getIdentity())) {
      this.logger.trace('ignoring own profile creation');
      return;
    }

    var matchingReply = null;
    this.pendingInviteReplies.snapshot().forEach(reply => {
      if (reply.senderFP === profile.getIdentity().fingerprint()) {
        matchingReply = reply;
      }
    });

    if (matchingReply !== null) {
      this.contacts.add(profile, this.account.getIdentity());
      this.contacts.flush(this.store);
      this.profileRef.addReceiver(profile.getIdentity(), this.account.getIdentity());
      this.profileRef.flush(this.store);
      this.pendingInviteReplies.remove(matchingReply, this.account.getIdentity());
      this.pendingInviteReplies.flush(this.store);
      this.logger.debug(this.account.getIdentity().fingerprint() + ' received a profile w/ matching InviteReply from ' + profile.getIdentity().fingerprint());
    } else if (this.profileRef.getReplicaControl()
                              .getReceiverFingerprints()
                              .has(profile.getIdentity().fingerprint())) {

      this.contacts.add(profile, this.account.getIdentity());
      this.contacts.flush(this.store);
      this.logger.debug(this.account.getIdentity().fingerprint() + ' received a profile w/ matching contact from ' + profile.getIdentity().fingerprint());
    }

  }

  _processInviteReply(reply) {
    let messaging = this.peer.getService(MessagingService.SERVICE_NAME);

    let message = {'command': 'invite-reply',
                   'payload': reply.getInviteReplyInfo()};

    this.logger.debug(this.account.getIdentity().fingerprint() + 'is processing reply to invite from ' + reply.senderFP);

    messaging.routeOutgoingMessage(reply.receiver.fingerprint(),
                                   reply.senderFP,
                                   reply.senderLinkups[0],
                                   ContactsService.SERVICE_NAME,
                                   message
                                 );
  }


  receiveMessage(source, destination, service, contents) {

    this.logger.debug(this.account.getIdentity().fingerprint() + ' recevied message from ' + source.fingerprint());

    if (contents['command'] === 'invite-reply') {

      this.logger.debug(this.account.getIdentity().fingerprint() + ' message is an invite-reply from ' + source.fingerprint());

      let inviteReplyInfo = contents['payload'];
      var matchingInvite = null;

      this.pendingInvites.snapshot().forEach(invite => {
        this.logger.trace('considering ' + invite.secret);
        if (invite.secret === inviteReplyInfo['secret']) {
          // bingo jackpot best friends forever
          matchingInvite = invite;
        }
      });
      if (matchingInvite !== null) {
        this.logger.debug(this.account.getIdentity().fingerprint() + ' message has a matching invite with secret ' + matchingInvite.secret);
        this.pendingInvites.remove(matchingInvite, this.account.getIdentity());
        this.pendingInvites.flush(this.store);
        this.profileRef.addReceiver(source, matchingInvite.sender);
        this.profileRef.flush(this.store);
      } else {
        this.logger.debug(this.account.getIdentity().fingerprint() + ' could not find a matching invite for secret ' + inviteReplyInfo['secret']);
      }
    }
  }

}

class InviteBase {
  constructor(sender, receiverName, linkups) {

    this.type = Types.INVITE();

    this.initializeStorable();

    if (sender !== undefined) {
      this.sender        = sender;
      this.addDependency(sender);
      this.senderLinkups = linkups;
      this.receiverName  = receiverName;
      this.secret        = Crypto.randomHexString(16);
    } else {
      this.sender        = null;
      this.senderLinkups = [];
      this.receiverName  = null;
      this.secret        = null;
    }
  }

  getInviteInfo() {
    return {
      's': this.sender.fingerprint(),
      'i': this.sender.getInfo(),
      'l': this.senderLinkups,
      'x': this.secret
    }
  }

  serialize() {
    return {
      'sender'        : this.sender.fingerprint(),
      'senderLinkups' : this.senderLinkups,
      'receiverName'  : this.receiverName,
      'secret'        : this.secret,
      'type'          : this.type
    };
  }

  deserialize(serial) {
    this.sender        = this.getDependency(serial['sender']);
    this.senderLinkups = serial['senderLinkups']
    this.receiverName  = serial['receiverName'];
    this.secret        = serial['secret'];
  }
}

class InviteInfo {
  static encode(info) {
    return Strings.b64EncodeUnicode(JSON.stringify(info));
  }

  static decode(codedInfo) {
    return JSON.parse(Strings.b64DecodeUnicode(codedInfo));
  }
}

class InviteReplyBase {
  constructor(inviteInfo, receiver, linkups) {

    this.type = Types.INVITE_REPLY();

    this.initializeStorable();

    if (inviteInfo !== undefined) {
      this.senderFP      = inviteInfo['s'];
      this.senderInfo    = inviteInfo['i'];
      this.senderLinkups = inviteInfo['l'];

      this.receiver = receiver;
      this.addDependency(receiver);
      this.receiverLinkups = linkups;

      this.secret = inviteInfo['x'];
    } else {
      this.senderFP      = null;
      this.senderInfo    = null;
      this.senderLinkups = null;

      this.receiver        = null;
      this.receiverLinkups = null;

      this.secret = null;
    }
  }

  getInviteReplyInfo() {
    return {
      'receiverFP'      : this.receiver.fingerprint(),
      'receiverInfo'    : this.receiver.getInfo(),
      'receiverLinkups' : this.receiverLinkups,
      'secret'          : this.secret
    };
  }

  serialize() {
    return {
      'senderFP'        : this.senderFP,
      'senderInfo'      : this.senderInfo,
      'senderLinkups'   : this.senderLinkups,
      'receiver'        : this.receiver.fingerprint(),
      'receiverLinkups' : this.receiverLinkups,
      'secret'          : this.secret,
      'type'            : this.type
    };
  }

  deserialize(serial) {
    this.senderFP        = serial['senderFP'];
    this.senderInfo      = serial['senderInfo'];
    this.senderLinkups   = serial['senderLinkups'];
    this.receiver        = this.getDependency(serial['receiver']);
    this.receiverLinkups = serial['receiverLinkups'];
    this.secret          = serial['secret'];
  }
}
class ProfileBase {

  constructor(identity) {

    this.type = Types.PROFILE();

    this.initializeStorable({noTimestamp: true});

    if (identity !== undefined) {
      this.identity = identity;

      let replId  = identity.getIdentityKey().sign(identity.fingerprint() + '//profile');
      this.info   = new ReplicatedNamespace(identity, {replicationId: replId});

      this.addDependency(this.identity);
      this.addDependency(this.info);
    } else {
      this.identity = null;
      this.info     = null;
    }
  }

  getPicture() {

  }

  setPicture() {

  }

  getStatus() {

  }

  setStatus() {

  }

  getEmail() {

  }

  setEmail() {

  }

  getPhone() {

  }

  setPhone() {

  }

  getIdentity() {
    return this.identity;
  }

  serialize() {
    return {
      'identity' : this.identity.fingerprint(),
      'info'     : this.info.fingerprint(),
      'type'     : this.type
    };
  }

  deserialize(serial) {
    this.identity = this.getDependency(serial['identity']);
    this.info     = this.getDependency(serial['info']);
  }

}


const Invite      = storable(InviteBase);
const InviteReply = storable(InviteReplyBase);
const Profile     = storable(ProfileBase);

export { Profile, Invite, InviteReply, InviteInfo };
export default ContactsService;
