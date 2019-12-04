"use strict";

const lodash = require("lodash");

function testLogFunction(message){
    console.log(message);
}

function main(){
    /*{
        const sourceArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        // Создаем из исходного массива, подмассивы с определенной максимальной длиной
        const subarrays = lodash.chunk(sourceArray, 2);
        console.log(subarrays);

        // Убирает из массива все нулевые и невалидные элементы
        const compacted = lodash.compact(sourceArray);
        console.log(compacted);

        // Выполняет конкатенацию массива с другими элементами или массивами
        const concatenated = lodash.concat(sourceArray, 5, [1, 2]);
        console.log(concatenated);

        // Ищет отличия
        const diff = lodash.difference(sourceArray, [2, 3, 4, 5]);
        console.log(diff);

        // Отбрасывает значения начиная/после определенного индекса
        const dropped = lodash.dropRight(sourceArray, 4);
        console.log(dropped);

        // Слитые значения
        const joined = lodash.join(sourceArray, "-");
        console.log(joined);

        // Отфильтрованый массив, меняет исходный
        lodash.pull(sourceArray, 1, 2);
        console.log(sourceArray);
    }*/

    {
        // Создаем новую функцию, которая будет вызываться только после 3го вызова
        const after3Calls = lodash.after(3, testLogFunction);
        after3Calls("After 3 calls");
        after3Calls("After 3 calls");
        after3Calls("After 3 calls");
        after3Calls("After 3 calls");

        // Создает функцию, принимающую только 1н аргумент, отбрасывая другие
        const aryFunc = lodash.ary(testLogFunction, 1);
        aryFunc("ary func");

        // Каррирование параметров функции в отдельные подфункции
        const abc = function(a, b, c) {
            return [a, b, c];
        };
        const curried = lodash.curry(abc);
        curried(1)(2)(3); // => [1, 2, 3]
        curried(1, 2)(3); // => [1, 2, 3]
        curried(1, 2, 3); // => [1, 2, 3]

        // Очень полезная функция, которая позволяет отбрасывать слишком часто вызывающуюся функцию,
        // вызывая с последними параметрами только когда устаканится
        const debounceLog = lodash.debounce(testLogFunction, 200);
        debounceLog("Test1");
        debounceLog("Test2");
        lodash.delay(debounceLog, 100, "Test3");
        setTimeout(debounceLog, 400, "Test4");

        // Аналог defer в golang, вызывается после выхода из области видимости
        lodash.defer(testLogFunction, "Defer called");

        // Аналог стандартного bind, но для обычных функций, не использующих this, только аргументы
        const partedFunc = lodash.partial(testLogFunction, "Parted");
        partedFunc();
        // Аналог варианта ниже
        const binded = testLogFunction.bind(null, "Binded");
        binded();

        // Можно сделать обертку для функции
        const wrapped = lodash.wrap(lodash.escape, (func, text) =>{
            return func(text);
        });
        console.log(wrapped("test & swap"));
    }
}

main();