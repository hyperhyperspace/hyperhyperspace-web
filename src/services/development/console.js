

class ConsoleService {

  static SERVICE_NAME = 'console';

  constructor(peer) {
    this.peer = peer;
    this.waitForInit = null;
    this.peer.registerService(this);
  }

  receiveMessage(source, destination, service, contents) {
    console.log('msg from ' + source.fingerprint() + ': ' + contents);
  }

  getServiceName() {
    return ConsoleService.SERVICE_NAME;
  }

  start() {
    if (this.waitForInit === null) {
      this.waitForInit = Promise.resolve(this);
      return this.waitForInit;
    }
  }

  waitUntilStartup() {
    return this.waitForInit;
  }
}

export default ConsoleService;
