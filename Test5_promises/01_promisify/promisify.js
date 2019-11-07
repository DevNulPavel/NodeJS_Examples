"use strict";

// TODO: Функция выдает awaitable объект, в котором у нас последний параметр - это коллбек???
module.exports = function(callbackBasedApi) {
    return function promisified() {
        // TODO: ???
        // Вызываем метод slice у массива arguments, тем самым подменяя объект вызова
        const args = [].slice.call(arguments); // TODO: Вызываем метод arguments у каждого объекта слайса ???
        // Коллбек нашего промиса
        const callback = (resolve, reject) => {
            // Внутренний коллбек добавления объекта
            const pushCallback = function(err, result) {
                // Если ошибка, обрубаем promise
                if(err) {
                    return reject(err);
                }

                // Иначе вызываем коллбек
                if(arguments.length <= 2) {
                    resolve(result);
                } else {
                    resolve([].slice.call(arguments, 1));
                }
            };
            args.push(pushCallback);
            callbackBasedApi.apply(null, args);
        };
        return new Promise(callback);
    }
};
