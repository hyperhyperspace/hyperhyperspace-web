import { DeliveryService } from '../../core/net/delivery.js';
import Logger from '../../core/util/logging.js';
import { Crypto } from '../../core/peer/crypto.js';

class MessagingService {

  SERVICE_NAME = 'messaging';

  SECONDS_PER_TICK = 60;
  MAX_TICK         = 10081;

  static ticksToWait(tick) {
    if (tick===0) {
      return 2;
    } else if (tick < 180) {
      return 1;
    } else if (tick < 360) {
      return 2;
    } else if (tick < 1440) {
      return 5;
    } else if (tick < 10080) {
      return 30;
    } else {
      return 60;
    }
  }

  static messageId(msg) {
    return Crypto.fingerprintLiteral(msg);
  }

  constructor(peer) {

    this.logger = new Logger(this);
    this.logger.setLevel(Logger.INFO());

    this.peer  = peer;
    this.store = peer.getStore();

    this.intervalID = null;

    this.pendingMessages  = {};
    this.messageTicks     = {};
    this.messageWaitTicks = {};

    this._tickBound = this._tick.bind(this);

    this.waitForInit = null;

    this.peer.registerService(this);

  }

  getServiceName() {
    return MessagingService.SERVICE_NAME;
  }

  start() {

    if (this.waitForInit === null) {
      this.logger.info('Starting messaging service for instance ' + this.peer.getAccountInstanceFingerprint());
      this.waitForInit = this._init().then(() => {
        this.logger.trace('Started messaging service for instance ' + this.peer.getAccountInstanceFingerprint());
      });
    }

    return this.waitForInit;
  }

  waitUntilStartup() {
    return this.waitForInit;
  }

  receiveMessage(source, destination, service, contents) {
    console.log('msg from ' + source.fingerprint() + ': ' + contents);
  }

  async _init() {

    await this.peer.getService(DeliveryService.SERVICE_NAME).waitUntilStartup();

  }

  async routeOutgoingMessage(sourceFP, destinationFP, destinationLinkup, destinationService, contentLiteral) {
    let msg = {
      sourceFP           : sourceFP,
      destinationFP      : destinationFP,
      destinationLinkup  : destinationLinkup,
      destinationService : destinationService,
      contentLiteral     : contentLiteral
    };

    this._enqueue(msg);
    this._send(msg);

    if (!this._tickIsEnabled()) {
      this._enableTick();
    }
  }

  _tick() {

    for (let msgId of Object.keys(this.pendingMessages)) {
      let ticks = this.messageTicks[msgId];
      let waitTicks = this.messageWaitTicks[msgId];

      if (ticks < MessagingService.MAX_TICK) {
        this.messageTicks[msgId] = ticks + 1;
      }

      if (waitTicks === 0) {
        let msg = this.pendingMessages[msgId];
        this._send(msg);
        waitTicks = MessagingService.ticksToWait(ticks);
      } else {
        waitTicks = waitTicks - 1;
      }

      this.messageWaitTicks[msgId] = waitTicks;
    }

    if (Object.keys(this.pendingMessages).length === 0) {
      this._disableTick();
    }
  }


  _send(msg) {
    this.peer.routeOutgoingMessageTmp(msg.sourceFP,
                                      msg.destinationFP,
                                      msg.destinationLinkup,
                                      msg.destinationService,
                                      msg.contentLiteral).then(() => {
                                        this._dequeue(MessagingService.messageId(msg));
                                      });
  }


  _enqueue(msg) {
    let msgId = MessagingService.messageId(msg);
    this.pendingMessages[msgId]  = msg;
    this.messageTicks[msgId]     = 0;
    this.messageWaitTicks        = MessagingService.ticksToWait(0);
  }

  _dequeue(msgId) {
    if (msgId in this.pendingMessages) {
      delete this.pendingMessages[msgId];
      delete this.messageTicks[msgId];
      delete this.messageWaitTicks[msgId];
    }
  }

  _tickIsEnabled() {
    return this.intervalID === null;
  }

  _disableTick() {
    clearInterval(this.intervalID);
    this.intervalID = null;
  }

  _enableTick() {
    this.intervalId = setInterval(this._tickBound, MessagingService.SECONDS_PER_TICK * 1000);
  }

}

export default MessagingService;
