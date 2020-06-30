import { v4 as uuid } from 'uuid';

import { Endpoint} from './linkup.js';
import { Crypto } from '../peer/crypto.js';
import { Types } from '../data/types.js';

import Logger from '../util/logging';
import Strings from '../util/strings.js';

const _CONNECTION_TIMEOUT   = 10;
const _VERIFICATION_TIMEOUT = 10;
const _DEFAULT_SEND_TIMEOUT = 10;
const _MAX_SEND_TIMEOUT     = 30;

class DeliveryService {

  static SERVICE_NAME = 'delivery';

  constructor(peer, identity, linkupServer, verifiedMessageCallback) {

    this.logger = new Logger(this);
    this.logger.setLevel(Logger.INFO());

    this.verifiedMessageCallback      = verifiedMessageCallback;
    this.handleConnectionFailureBound = this.handleConnectionFailure.bind(this);
    this.handleConnectionSuccessBound = this.handleConnectionSuccess.bind(this);

    this.peer            = peer;
    this.identity        = identity;
    this.linkupServer    = linkupServer;

    this.verifiedMessageCallback = verifiedMessageCallback;

    let listen = new Endpoint(linkupServer, identity.fingerprint());
    this.networkNode = peer.getPeerManager()
                              .getNetworkManager()
                                 .getNode(listen);


    // connection info

    // identity => verified connection
    this.verifiedConnections = {};

    // callId => verified connection
    this.allConnections = {};

    // callId => identity
    this.connectionAttempts = new Map();

    // message info

    // uuid => pendingmessage
    this.pendingMessages = {};

    // identity => set(uuid)
    this.pendingMessagesByIdentity = {};

    // connection status
    this.status = new Map();

    this.networkNode.setConnectionCallback(conn => this.receiveConnection(conn));

    this.waitForInit = null;

    this.peer.registerService(this);

  }

  getServiceName() {
    return DeliveryService.SERVICE_NAME;
  }

  start() {
    if (this.waitForInit === null) {
      this.networkNode.start();
      this.waitForInit = Promise.resolve(this);
      //setInterval(() => { console.log(this.getDiagnosticsInfo()); }, 10000);
    }

    return this.waitForInit;
  }

  waitUntilStartup() {
    return this.waitForInit;
  }

  getDiagnosticsInfo() {
    return {
      verified: this.verifiedConnections,
      all: this.allConnections,
      attempts: this.connectionAttempts,
      pending: this.pendingMessages,
      pendingById: this.pendingMessagesByIdentity,
      connectionStatus: this.status
    };
  }

  getPendingMessagesForIdentity(targetId) {

    if (targetId !== null && targetId in this.pendingMessagesByIdentity) {

      let pending = this.pendingMessagesByIdentity[targetId];
      let timestamp = Date.now();

      let msgsToCheck = Array.from(pending);
      for (let msgUUID of msgsToCheck) {
        let msg = this.pendingMessages[msgUUID];
        if (timestamp > msg['deadline']) {
          pending.delete(msgUUID);
          delete this.pendingMessages[msgUUID];
          setTimeout(() => {
            msg['failure']('timeout');
          }, 0);
        }
      }

      if (pending.size === 0) {
        delete this.pendingMessagesByIdentity[targetId]
      }

      return new Set(pending);
    } else {
      return new Set();
    }
  }

  handleConnectionFailure(callId) {

    this.logger.debug('Failure handle called for callId ' + callId);

    // if a connection failed while there are messages that are
    // still 'live' (i.e. not timeouted), we will try to re-connect

    var targetId = null;

    if (callId in this.connectionAttempts) {
      targetId = this.connectionAttempts[callId];
      delete this.connectionAttempts[callId];
    } else if (callId in this.allConnections) {
      let vconn = this.allConnections[callId];
      delete this.allConnections[callId];
      vconn.disposeConnection();
      targetId = vconn.getExpectedRemoteFP();
      if (targetId !== null) {
        if (targetId in this.verifiedConnections &&
            this.verifiedConnections[targetId].getCallId() === callId) {
              delete this.verifiedConnectios[targetId]
            }
      }
    }

    let pending = this.getPendingMessagesForIdentity(targetId);

    if (pending.size > 0) {
      var linkup = null;
      pending.forEach(msgUUID => {
        linkup = this.pendingMessages[msgUUID]['linkup'];
      });
      this.initiateConnection(targetId, linkup);
    }
  }

  handleConnectionSuccess(callId) {

    this.logger.debug('Success callback called for callId ' + callId);

    let vconn = this.allConnections[callId];

    if (vconn !== undefined && vconn.ready()) {

      let targetId = vconn.getRemoteIdentity().fingerprint();
      this.verifiedConnections[targetId] = vconn;

      let pending = this.getPendingMessagesForIdentity(targetId);

      if (pending.size > 0) {
        pending.forEach(msgUUID => {
          let msg = this.pendingMessages[msgUUID];
          delete this.pendingMessages[msgUUID];
          vconn.send(msg['payload']);
          setTimeout(() => {
            msg['success']();
          }, 0);
          delete this.pendingMessagesByIdentity[targetId];
        });
      }

    }

  }

  receiveConnection(conn) {

    let expectedRemoteFP = null;
    let callId = conn.getLocalCallId();

    this.logger.debug('received connection on ' + this.identity.fingerprint() + ' side, callId is ' + callId + '.');

    if (callId in this.connectionAttempts) {
      expectedRemoteFP = this.connectionAttempts[callId];
      delete this.connectionAttempts[callId];
    }

    let vconn = new VerifiedConnection(this.identity,
                                       conn,
                                       this.verifiedMessageCallback,
                                       this.handleConnectionSuccessBound,
                                       this.handleConnectionFailureBound,
                                       expectedRemoteFP
                                     );

    this.allConnections[callId] = vconn;

  }

  initiateConnection(targetId, linkup) {

    let callId = uuid();
    let remote = new Endpoint(linkup, targetId);

    this.logger.debug(this.identity.fingerprint() + ' initiating connection to ' + targetId);

    this.connectionAttempts[callId] = targetId;

    this.networkNode.open(callId, remote);

    window.setTimeout(() => {
      if (callId in this.connectionAttempts) {
        this.handleConnectionFailure(callId);
      }
    }, _CONNECTION_TIMEOUT * 1000);

  }

  getVerifiedConnection(targetId) {
    let vconn = this.verifiedConnections[targetId];

    if (vconn === undefined) {
      vconn = null;
    } else if (!vconn.ready()) {
      delete this.verifiedConnections[targetId]
      vconn = null;
    }

    return vconn;
  }

  shouldWaitForConnection(targetId) {

    let inProcess = new Set(Object.values(this.connectionAttempts));

    for (let vconn of Object.values(this.allConnections)) {
      let expectedRemoteFP = vconn.getExpectedRemoteFP();
      if (expectedRemoteFP !== null) {
        inProcess.add(expectedRemoteFP);
      }
    }

    return inProcess.has(targetId);
  }

  getConnectionOrInitiate(targetId, linkup) {
    var conn = this.getVerifiedConnection(targetId);

    if (conn === null) {
      if (!this.shouldWaitForConnection(targetId)) {
        this.initiateConnection(targetId, linkup);
      }
    }

    return conn;
  }


  send(targetId, linkupServer, payload, timeout) {

    this.logger.trace('got send request to ' + targetId);

    if (timeout === undefined) {
      timeout = _DEFAULT_SEND_TIMEOUT;
    }

    if (timeout > _MAX_SEND_TIMEOUT) {
      throw new Error('Maximum timeout value is ' + _MAX_SEND_TIMEOUT + ', received ' + timeout);
    }

    let vconn = this.getConnectionOrInitiate(targetId, linkupServer);

    let result = new Promise((resolve, reject) => {

      this.logger.trace('generating promise for message sending');

      var sent = false;
      if (vconn !== null) {
        vconn.send(payload);
        sent = true;
      }

      if (sent) {
        this.logger.trace('sending immediately');
        resolve();
      } else {
        this.logger.trace('sending has to wait for a connection');
        let msgUUID = uuid();
        let msg = {
          'uuid': msgUUID,
          'targetId': targetId,
          'linkup': linkupServer,
          'success': resolve,
          'failure': reject,
          'payload': payload,
          'deadline': Date.now() + timeout * 1000,
        }

        this.pendingMessages[msgUUID] = msg;

        let pending = this.pendingMessagesByIdentity[targetId];
        if (pending === undefined) {
          pending = new Set();
          this.pendingMessagesByIdentity[targetId] = pending;
        }
        pending.add(msgUUID);
      }
    });

    return result;
  }

}

class VerifiedConnection {
  constructor(identity, connection, messageCallback, readyCallback, rejectCallback, expectedRemoteFP) {

    this.logger = new Logger(this);
    this.logger.setLevel(Logger.INFO());

    this.connection       = connection;
    this.expectedRemoteFP = expectedRemoteFP === undefined? null : expectedRemoteFP;

    this.identity         = identity;
    this.remoteIdentity   = null;

    this.challenge       = null;
    this.remoteChallenge = null;

    this.verified       = false;
    this.remoteVerified = false;
    this.rejected       = false;

    this.messageCallback = messageCallback;
    this.readyCallback   = readyCallback === undefined?  null : readyCallback;
    this.rejectCallback  = rejectCallback === undefined? null : rejectCallback;

    this.closeCallbacks = []

    this.connection.setMessageCallback(msg => this._processReceivedCallback(msg));

    window.setTimeout(() => {
      if (!this.rejected && !this.ready()) {
        this._sendRejection('verification-timeout');
        this.rejected = true;
        if (this.rejectCallback !== null) {
          this.rejectCallback('verification-timeout');
        }
      }
    }, _VERIFICATION_TIMEOUT * 1000);

    if (this.expectedRemoteFP !== null) {
      this._sendIdentityRequest()
      this._sendIdentity();
    }

  }

  getExpectedRemoteFP() {
    return this.expectedRemoteFP;
  }


  getCallId() {
    return this.connection.getLocalCallId();
  }

  getIdentity() {
    return this.identity;
  }

  getRemoteIdentity() {
    return this.remoteIdentity;
  }

  send(payload) {
    if (this.ready()) {
      this._send(payload, 'data');
    } else {
      throw new Error('Attempted to send on an unverified connection.');
    }
  }

  ready() {
    let ready = !this.rejected && this.verified && this.remoteVerified &&
                this.connection.channelIsOperational();
    return ready;
  }

  disposeConnection() {
    if (this.connection !== null) {
      this.connection.close();
    }
  }

  _send(payload, type) {

    this.logger.debug(this.identity.fingerprint() + ' sending through callId ' + this.connection.getLocalCallId() + ': type=' + type);
    this.logger.trace('payload=' + payload);

    if (this.rejected) {
      throw new Error('Trying to send through an already rejected connection.')
    }

    let msg = {};

    msg['sourceIdentity'] = this.identity.fingerprint();
    msg['type']    = type;
    if (this.remoteIdentity !== null) {
      msg['destinationIdentity'] = this.remoteIdentity.fingerprint();
      msg['payload'] = Strings.chunk(payload, 100).map(s => /*this.remoteIdentity.encrypt(*/s/*)*/);
    } else {
      msg['payload'] = payload;
    }

    msg['signature'] = this.identity.getIdentityKey().sign(payload);

    this.connection.send(JSON.stringify(msg));
  }

  _sendIdentityRequest() {
    this._send(this.expectedRemoteFP, 'identity-request');
  }

  _sendIdentity() {
    this._send(JSON.stringify(this.identity.serialize()), 'identity');
  }

  _sendChallenge() {
    if (this.challenge === null) {
      this.challenge = Crypto.randomHexString(64);
    }

    if (this.remoteIdentity === null) {
      throw new Error("Can't issue connection challenge if remote identity is unknown.");
    }

    this._send(this.challenge, 'challenge');
  }

  _answerChallenge() {
    this._send(this.remoteChallenge, 'challenge-answer');
  }

  _sendVerificationAck() {
    this._send(this.remoteIdentity.fingerprint(), 'verification-ack')
  }

  _sendRejection(reason) {
    this._send(reason, 'rejection')
  }

  _processReceivedCallback(msg) {
    let rejectedBefore = this.rejected;
    let readyBefore    = this.ready();
    try {
      this._processRecieved(msg);
    } catch(e) {
      this.logger.warning('Error while processing incoming message: ' + e);

      if (this.rejected && !rejectedBefore) {
        var code = 'unknown';
        if (e.code !== undefined) {
          code = e.code;
        }

        if (this.rejectCallback !== null) {
          this.rejectCallback(code);
        }
        this._sendRejection(code);
      }

      throw e;

    }

    if (this.ready() && !readyBefore) {
      this.readyCallback(this.getCallId());
    }
  }

  _processRecieved(msg) {

    let literal = JSON.parse(msg);

    this.logger.debug(this.identity.fingerprint() + ' received message of type ' + literal.type);

    var payload;

    if ('destinationIdentity' in literal) {
      let dest = literal['destinationIdentity'];
      if (dest !== this.identity.fingerprint()) {
        let e = new Error('Message addressed to wrong identity.');
        e.code = 'wrong-identity';
        throw e;
      }
      payload = Strings.dechunk(literal['payload'].map(s => /*this.identity.getIdentityKey().decrypt(*/s/*)*/));
    } else {
      payload = literal['payload'];
    }


    // TODO *IMPORTANT* check payload signature HERE

    this.logger.trace('payload=' + payload)

    if ('type' in literal) {
      if (literal['type'] === 'identity-request') {
        this._processReceivedIdentityRequest(payload);
      } else if (literal['type'] === 'identity')  {
        this._processReceivedIdentity(payload);
      } else if (literal['type'] === 'challenge') {
        this._processReceivedChallenge(payload);
      } else if (literal['type'] === 'challenge-answer') {
        this._processReceivedChallengeAnswer(payload);
      } else if (literal['type'] === 'verification-ack') {
        this._processVerificationAck(payload);
      } else if (literal['type'] === 'data') {
        if (this.ready()) {
          this.messageCallback(this.remoteIdentity, this.identity, payload);
        }
      }
     } else {
       this.warn('RECEIVED UNKNOWN MESSAGE TYPE:' + literal['type'] + '(callId: ' + this.getCallId() + ')')
      let e = new Error('Missing type in message');
      e.code = 'missing-message-type';
      throw e;
    }
  }

  _processReceivedIdentityRequest(payload) {
    if (this.identity.fingerprint() === payload) {
      this._sendIdentity();
    }
  }

  _processReceivedIdentity(payload) {
    let serial = JSON.parse(payload);

    if (serial['type'] !== Types.IDENTITY()) {
      let e = new Error('Received identity has wrong type.');
      this.rejected = true;
      e.code = 'wrong-type-for-identity';
      throw e;
    }

    let id = Types.deserializeWithType(serial);

    if (this.remoteIdentity !== null) {
      if (!this.remoteIdentity.equals(id)) {
        let e = new Error('Received multiple different identities.');
        e.code = 'multiple-identities-received';
        this.rejected = true;
        throw e;
      }
    }

    if (this.expectedRemoteFP !== null) {
      if (this.expectedRemoteFP !== id.fingerprint()) {
        let e = new Error('Received identity is not what was expected.');
        e.code = 'received-wrong-identity';
        this.rejected = true;
        throw e;
      }
    }

    this.remoteIdentity = id;
    this._sendChallenge();
  }

  _processReceivedChallenge(payload) {
    if (this.remoteChallenge === null || this.remoteChallenge === payload) {
      this.remoteChallenge = payload;
      this._answerChallenge();
    } else {
      let e = new Error('Received multile different challenges.');
      this.rejected = true;
      e.code = 'received-multiple-challenges';
      throw e;
    }

  }

  _processReceivedChallengeAnswer(payload) {
    if (this.challenge !== null && this.challenge === payload) {
      this.verified = true;
      this._sendVerificationAck();
    } else {
      let e = new Error('Received wrong answer for challenge.');
      this.rejected = true;
      e.code = 'wrong-challenge-answer';
      throw e;
    }
  }

  _processVerificationAck(payload) {
    if (this.identity.fingerprint() === payload) {
      this.remoteVerified = true;
    } else {
      let e = new Error('Received wrong identity verification acknowledge.');
      this.rejected = true;
      e.code = 'wrong-identity-ack';
      throw e;
    }
  }
}


export { DeliveryService };
