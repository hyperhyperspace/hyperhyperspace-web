import LinkupManager, { Endpoint} from './linkup';
import WebRTCConnection from './webrtc';

class NetworkManager {
  constructor(linkupManager) {
    this.linkupManager = linkupManager;
    this.nodes = new Map();
  }

  activateNode(endpoint) {
    if (this.nodes.has(endpoint.url())) {
      return this.nodes.get(endpoint.url());
    } else {
      const node = new NetworkNode(this.linkupManager, endpoint);
      this.nodes.set(endpoint.url(), node);
      return node;
    }
  }
}


class NetworkNode {
  constructor(linkupManager, localEndpoint) {
    this.linkupManager = linkupManager;
    this.localEndpoint = localEndpoint;
    this.connections = new Map();
    this.connectionCallback   = null;
    this.listener = null;

  }

  setConnectionCallback(connectionCallback) {
    this.connectionCallback = connectionCallback;
  }

  start() {
    this.listener = this.linkupManager.getListener(this.localEndpoint);
    this.listener.setDefaultCallback((callId, message, replyServerUrl, replyLinkupId) => {
      var remoteEndpoint = new Endpoint(replyServerUrl, replyLinkupId);
      var caller = this.linkupManager.getCaller(remoteEndpoint, this.localEndpoint);
      var conn = this._getConnection(callId);
      conn.answer(message, this.listener, caller);
    });
  }

  // TODO
  stop() {

  }

  open(callId, remoteEndpoint) {

    var listener = this.linkupManager.getListener(this.localEndpoint);
    var caller = this.linkupManager.getCaller(remoteEndpoint, this.localEndpoint);

    var conn = this._getConnection(callId);

    conn.open(callId, listener, caller, 'peer-main')
  }

  _getConnection(callId) {
    var conn = this.connections.get(callId);

    if (conn == null) {
      conn = new WebRTCConnection(callId, (conn) => {
                                      if (this.connectionCallback != null) {
                                        this.connectionCallback(conn);
                                      } 
                                    });
      this.connections.set(callId, conn);
    }
    return conn;
  }

}

export default NetworkManager;
