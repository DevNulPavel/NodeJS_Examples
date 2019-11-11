"use strict";

const stream = require('stream');
const Chance = require('chance');

const chance = new Chance();

// Таким образом можно создавать новые потоки
class RandomStream extends stream.Readable {
    constructor(options) {
        super(options);
    }
    
    // Реализуем метод чтения из данного потока
    _read(size) {
        // Генерим рандомную строку
        const chunk = chance.string();
        console.log(`Pushing chunk of size: ${chunk.length}`);
        // Для отправки вызываем метод push
        this.push(chunk, 'utf8');
        // TODO: ???
        if(chance.bool({likelihood: 5})) {
            this.push(null);
        }
    }
}

module.exports = RandomStream;