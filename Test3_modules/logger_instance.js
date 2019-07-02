"use strict";

function Logger(name) {
  this.count = 0;
  this.name = name;
}

Logger.prototype.log = function(message) {
  this.count++;
  console.log('[' + this.name + '] ' + message);
};

// При импортировании будет создаваться каждый раз новый экземпляр
module.exports = new Logger('DEFAULT');
