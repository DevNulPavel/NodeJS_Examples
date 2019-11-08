"use strict";

// Функция-генератор помечается *
function* fruitGenerator() {
  yield 'apple';
  yield 'orange';
  return 'watermelon';
}

// У генератора можно вызывать next до тех пор, пока второй параметр done не true
const newFruitGenerator = fruitGenerator();
console.log(newFruitGenerator.next()); // { value: 'apple', done: false }
console.log(newFruitGenerator.next()); // { value: 'orange', done: false }
console.log(newFruitGenerator.next()); // { value: 'watermelon', done: true }
console.log(newFruitGenerator.next()); // { value: undefined, done: true }
