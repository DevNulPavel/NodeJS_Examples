"use strict";

// Старый способ работы с классами как с функциями
function Logger(name) {
  this.name = name;
}

Logger.prototype.log = function(message) {
  console.log(`[${this.name}] ${message}`);
};

Logger.prototype.info = function(message) {
  this.log(`info: ${message}`);
};

Logger.prototype.verbose = function(message) {
  this.log(`verbose: ${message}`);
};

// Экспортируем базовую функцию
module.exports = Logger;
