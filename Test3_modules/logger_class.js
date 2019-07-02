"use strict";

// Специальный класс для логирования
class Logger {
  constructor(name) {
    this.name = name;
  }

  // Обычный лог
  log(message) {
    console.log(`[${this.name}] ${message}`);
  }

  // Информационный
  info(message) {
    this.log(`info: ${message}`);
  }

  // Подробный
  verbose(message) {
    this.log(`verbose: ${message}`);
  }
}

// Экспортируем класс логирования
module.exports = Logger;
