var _TRACE   = 0;
var _DEBUG   = 1;
var _INFO    = 2;
var _WARNING = 3;
var _ERROR   = 4;

class Logger {
  static TRACE()   { return _TRACE; }
  static DEBUG()   { return _DEBUG; }
  static INFO()    { return _INFO; }
  static WARNING() { return _WARNING; }
  static ERROR()   { return _ERROR; }

  constructor(target) {
    this.target = target;
    this.level = _INFO;
  }

  setLevel(level) {
    this.level = level;
  }

  trace(msg)   { this.log(msg, _TRACE); }
  debug(msg)   { this.log(msg, _DEBUG); }
  info(msg)    { this.log(msg, _INFO); }
  warning(msg) { this.log(msg, _WARNING); }
  error(msg)   { this.log(msg, _ERROR); }

  log(msg, level) {
    if (level >= this.level) {
      var className = 'Not within class';
      if (this.target) className = this.target.constructor.name;
      console.log('[' + className + ']: ' + msg);
    }
  }
}

export default Logger;
