
class Strings {
  static pad = (xs, n) => {
    while (xs.length < n) {
      xs = '0' + xs;
    }

    return xs;
  }

  static chunk(string, chunkSize) {
    var rest = string;
    var chunks = [];
    while (rest.length > 0) {
      let chunk = rest.slice(0, chunkSize);
      rest = rest.slice(chunkSize);
      chunks.push(chunk);
    }
    return chunks;
  }

  static dechunk(chunks) {
    return chunks.join('');
  }
}

export default Strings;
