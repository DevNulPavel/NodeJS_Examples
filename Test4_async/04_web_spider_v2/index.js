"use strict";

const request = require('request');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const utilities = require('./utilities');

// Парсинг ссылок с определенной глубиной
function spiderLinks(currentUrl, body, nesting, callback) {
    // Если достигли нужной глубины, то просто выходим на следующей итерации цикла
    if(nesting === 0) {
        return process.nextTick(callback);
    }
    
    // Получаем ссылки на страницу
    let links = utilities.getPageLinks(currentUrl, body);

    // Специальная функция итерирования по элементам
    function iterate(index) {
        // Дошли до конца - выходим
        if(index === links.length) {
            return callback();
        }
        
        // Начинаем вытягивание данных по очередной ссылке с нужным индексом
        spider(links[index], nesting - 1, function(err) {
            if(err) {
                return callback(err);
            }
            iterate(index + 1);
        });
    }

    // Начинаем итерацию с 0 элемента списка
    iterate(0);
}

function saveFile(filename, contents, callback) {
    // Создаем папки если надо
    mkdirp(path.dirname(filename), err => {
        if(err) {
            return callback(err);
        }
        // Записываем данные в файл
        fs.writeFile(filename, contents, callback);
    });
}

function download(url, filename, callback) {
    console.log(`Downloading ${url}`);
    // Выполняем запрос данных с сервера
    request(url, (err, response, body) => {
        // Ошибка загрузки
        if(err) {
            return callback(err);
        }

        // Все успешно загрузили, сохраняем в файл
        saveFile(filename, body, err => {
            if(err) {
                return callback(err);
            }
            // Вызываем коллбек успешной загрузки файла
            console.log(`Downloaded and saved: ${url}`);
            callback(null, body);
        });
    });
}

function spider(url, nesting, callback) {
    // Получаем путь к файлу
    const filename = "result/" + utilities.urlToFilename(url);
    // Читаем файл по данному пути
    fs.readFile(filename, 'utf8', function(err, body) {
        // Если у нас ошибка, то есть нет файла
        if(err) {
            // Если ошибка отличная от "нет файла", вызываем коллбек
            if(err.code !== 'ENOENT') {
                callback(err);
                return;
            }
            
            // Если действительно нету файла, то начинаем загрузку
            download(url, filename, function(err, body) {
                // Если возникла ошибка - вызываем коллбек
                if(err) {
                    return callback(err);
                }
                
                // Парсим ссылки на данной странице
                spiderLinks(url, body, nesting, callback);
            });
            return;
        }
        
        // Если данные есть уже в файле, то просто обрабатываем
        spiderLinks(url, body, nesting, callback);
    });
}

spider(process.argv[2], 1, (err) => {
    if(err) {
        console.log(err);
        process.exit();
    } else {
        console.log('Download complete');
    }
});