"use strict";

// Экспоритуем просто функцию
module.exports = (message) => {
  console.log(`info: ${message}`);
};

// Так же можем экспортировать подфункцию verbose
module.exports.verbose = (message) => {
  console.log(`verbose: ${message}`);
};
