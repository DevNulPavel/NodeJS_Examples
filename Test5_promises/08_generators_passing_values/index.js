"use strict";

// Генератор так же может получать значения снаружи
function* twoWayGenerator() {
  const what = yield null;
  console.log('Hello ' + what);
}

const twoWay = twoWayGenerator();
twoWay.next();        // Сначала включаем итерирование по генератору
twoWay.next('world'); // Затем пробрасываем значения внутрь
