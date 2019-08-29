import Strings from './strings.js';

class Timestamps {

  static currentTimestamp() {
    return 'T' + Strings.pad(Date.now().toString(16), 11);
  }

  static uniqueTimestamp() {
    const random = Strings.pad(Math.floor(Math.random()*0xFFFFFFFFFF).toString(16), 10);
    return Timestamps.currentTimestamp() + random;
  }

  static epochTimestamp() {
    return 'T' + Strings.pad('', 11) + Strings.pad('', 10);
  }

  static parseUniqueTimestamp(unique) {
    return parseInt(unique.substring(1,12), 16);
  }


  static compare(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    // returns sign(a - b)
    return a.localeCompare(b);
  }

  static before(a, b) {
    return Timestamps.compare(a, b) < 0;
  }

  static after(a, b) {
    return Timestamps.compare(a, b) > 0;
  }

}

export default Timestamps;
