
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

  static b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
  }

  static b64DecodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }
}

export default Strings;
