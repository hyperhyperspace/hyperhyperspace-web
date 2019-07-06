import Logger from '../util/logging';

/* A WebRTC Connection is used to create a bi-directional
   DataChannel between two hosts. A pair of LinkupListener,
   LinkupCaller objects are used to send signalling
   messages between the two parties in order to establish
   the browser-to-browser connection. */

const RTC_CONN_DESCRIPTION = 'RTC_CONN_DESCRIPTION';
const ICE_CANDIDATE = 'ICE_CANDIDATE';

class WebRTCConnection {

  constructor(callId, readyCallback) {
    this.logger = new Logger(this);
    this.logger.setLevel(Logger.TRACE());

    this.localCallId  = callId;
    this.remoteCallId = null;
    this.channelName  = null;
    this.connection   = null;
    this.channel      = null;
    this.initiator    = false;

    this.readyCallback   = readyCallback;
    this.messageCallback = null;

    this.incomingMessages = [];

    this.onmessage = (ev) => {
      this.logger.debug(this.localCallId + ' received message from ' + this.remoteCallId);
      this.logger.trace('message is ' + ev.data);
      if (this.messageCallback != null) {
        this.messageCallback(ev.data);
      } else {
        this.incomingMessages.push(ev);
      }
    }

    this.onready = () => {
      this.logger.debug('connection from ' + this.localCallId + ' to ' + this.remoteCallId + ' is ready');
      this.readyCallback(this);
    }

    this.channelStatusChangeCallback = () => {
      this.logger.debug('channel status is ' + this.channel.readyState);
    }
  }

  setMessageCallback(messageCallback) {
    this.messageCallback = messageCallback;

    if (messageCallback != null) {
      while (this.incomingMessages.length > 0) {
        var ev = this.incomingMessages.shift();
        messageCallback(ev);
      }
    }
  }

  /* To initiate a connection, an external entity must create
     a WebRTCConnection object and call the open() method. */

  open(remoteCallId, linkupListener, linkupCaller, channelName) {
    this._init(linkupListener, linkupCaller);

    this.remoteCallId    = remoteCallId;
    this.initiator   = true;
    this.channelName = channelName;

    this._setUpLinkupListener()

    var constraints = null;
    this.channel     =
            this.connection.createDataChannel(channelName,
                                              constraints);
    this._setUpChannel();

    this.connection.createOffer().then(
      (description) => {
        this.connection.setLocalDescription(description);
        this._signalConnectionDescription(description);
      },
      (error) => {
        this.logger.error('error creating offer: ' + error);
      })
  }

  /* Upon receiving a connection request, an external entity
     must create a connection and pass the received message,
     alongisde the LinkupListener and LinkupCaller to be used
     for signalling, to the answer() method. After receiving
     the initial message, the connection will configure the
     listener to pass along all following signalling messages. */

  answer(message, linkupListener, linkupCaller) {
    this._init(linkupListener, linkupCaller);

    this.initiator   = false;
    this._handleSignallingMessage(message);
  }

  close() {

  }

  send(message) {
    this.logger.trace(this.localCallId + ' sending msg to ' + this.remoteCallId + ' through ' + this.channelName);
    this.channel.send(message);
  }

  _init(linkupListener, linkupCaller) {
    var servers     = {iceServers : [{urls : ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']}]};

    this.linkupListener = linkupListener;
    this.linkupCaller   = linkupCaller;
    this.connection     = new RTCPeerConnection(servers);
    this.gatheredICE    = false;

    this.connection.onicecandidate = (ev) => {
      if (ev.candidate == null) {
        this.gatheredICE = true;
        this.logger.debug(this.localCallId + ' is done gathering ICE candiadtes');
      } else {
        this._signalIceCandidate(ev.candidate);
      }

    };

    this._handleSignallingMessage = (messageJSON) => {

      var message = JSON.parse(messageJSON);
      var signal  = message['signal'];
      var data    = message['data'];

      this.logger.debug(this.localCallId + ' is handling ' + signal + ' from ' + data['callId']);
      this.logger.trace('received data is ' + JSON.stringify(data));
      switch (signal) {
        case RTC_CONN_DESCRIPTION:
          this._handleReceiveConnectionDescription(data['callId'], data['channelName'], data['description']);
          break;
        case ICE_CANDIDATE:
          this._handleReceiveIceCandidate(data['candidate']);
          break;
      }
    };

  }

  _setUpLinkupListener() {
    this.linkupListener.registerCallback(this.localCallId,
                                         this._handleSignallingMessage);
  }


  _signalConnectionDescription(description) {
    this._signalSomething(RTC_CONN_DESCRIPTION,
                          {'callId':          this.localCallId,
                           'channelName': this.channelName,
                           'description': description
                          });
  }

  _signalIceCandidate(candidate) {
    this._signalSomething(ICE_CANDIDATE,
                          {'callId':          this.localCallId,
                           'channelName': this.channelName,
                           'candidate':   candidate
                          });
  }

  _signalSomething(signal, data) {
    this.logger.debug(this.localCallId + ' signalling to ' + this.remoteCallId + ' (' + signal + ')');
    this.logger.trace('sent data is ' + JSON.stringify(data));
    this.linkupCaller.send(this.remoteCallId,
                           JSON.stringify(
                             {'signal':signal,
                              'data': data
                             }));
  }

  _handleReceiveConnectionDescription(remoteCallId, channelName, description) {
    this.remoteCallId    = remoteCallId;
    this.channelName = channelName;

    this.connection.ondatachannel = (ev) => {
      this.logger.debug(this.localCallId + ' received DataChannel from ' + this.remoteCallId);
      this.channel = ev.channel;
      this._setUpChannel();
    }

    this.connection.setRemoteDescription(description);
    if (! this.initiator) {
      this._setUpLinkupListener()
      this.connection.createAnswer().then(
        (description) => {
          this.connection.setLocalDescription(description);
          this._signalConnectionDescription(description);
        },
        (error) => {
          this.logger.error('error generating answer: ' + error);
        }
      );
    }
  }

  _handleReceiveIceCandidate(candidate) {
    this.connection.addIceCandidate(candidate);
  }

  _setUpChannel() {

    var stateChange = () => {
      this.logger.debug(this.localCallId + ' readyState now is ' + this.channel.readyState);
      if (this.channel.readyState === 'open') {
        this.onready();
      }
    }

    this.channel.onmessage = this.onmessage;
    this.channel.onopen    = stateChange;
    this.channel.onclose   = stateChange;
  }
}

export default WebRTCConnection;
