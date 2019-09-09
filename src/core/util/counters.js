import Timestamps from './timestamps.js';
import Strings from './strings.js';

const COUNTER_BITS = 64;
const COUNTER_LEN  = COUNTER_BITS / 4; // we use hexadecimal

class Counters {

  // a unique counter is a counter followed by a unique timestamp (unix time + randomness)
  static uniqueCounter() {
    return Strings.pad('', COUNTER_LEN) + Timestamps.uniqueTimestamp();
  }

  // to increment the counter, the timestap part is ignored and re-generated after increment
  static incrementUniqueCounter(unique) {
    let counter = parseInt(unique.substring(0, COUNTER_LEN), 16)
    return Strings.pad((counter+1).toString(16), COUNTER_LEN) + Timestamps.uniqueTimestamp();
  }

  static compare(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a.localeCompare(b);
  }

  static smaller(a, b) {
    return Counters.compare(a, b) < 0;
  }

  static larger(a, b) {
    return Counters.compare(a, b) > 0;
  }

}

export default Counters;
