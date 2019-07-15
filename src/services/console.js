

class ConsoleService {

  static SERVICE_NAME = 'console';

  constructor(peer) {
    this.peer = peer;
  }

  receiveMessage(source, destination, service, contents) {
    console.log('msg from ' + source.fingerprint() + ': ' + contents);
  }

  getServiceName() {
    return ConsoleService.SERVICE_NAME;
  }

  start() {
    return this;
  }

  waitUntilStartup() {
    return Promise.resolve(this);
  }
}

export { ConsoleService };
