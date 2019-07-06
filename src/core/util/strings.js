
class Strings {
  static pad = (xs, n) => {
    while (xs.length < n) {
      xs = '0' + xs;
    }

    return xs;
  }
}

export default Strings;
