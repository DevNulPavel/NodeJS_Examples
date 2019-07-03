"use strict";

const request = require('request');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const async = require('async');
const utilities = require('./utilities');

function spiderLinks(currentUrl, body, nesting, callback) {
    if(nesting === 0) {
        return process.nextTick(callback);
    }
    
    // Парсим ссылки
    let links = utilities.getPageLinks(currentUrl, body);  //[1]

    // Итерируемся по этим ссылкам
    function iterate(index) {
        if(index === links.length) {
            return callback();
        }
        
        spider(links[index], nesting - 1, function(err) {
            if(err) {
                return callback(err);
            }
            iterate(index + 1);
        });
    }
    iterate(0);
}

function download(url, filename, callback) {
    console.log(`Downloading ${url}`);
    let body;
    
    // Первая задача - скачать файл
    var task1 = callback => {
        request(url, (err, response, resBody) => {
            if(err) {
                return callback(err);
            }
            body = resBody;
            callback();
        });
    };
    // Вторая задача - создать папку для файла если ее еще нету
    var task2 = mkdirp.bind(null, path.dirname(filename));
    // Третья задача - записать данные в файл
    var task3 = callback => {
        fs.writeFile(filename, body, callback);
    };
    
    var tasks = [task1, task2, task3];

    // Финальный коллбек
    var finalCallback = err => {
        if(err) {
            return callback(err);
        }
        console.log(`Downloaded and saved: ${url}`);
        callback(null, body);
    };

    // Используем модуль async
    async.series(tasks, finalCallback);
}

function spider(url, nesting, callback) {
    const filename = "result/" + utilities.urlToFilename(url);

    // Читаем файлик
    fs.readFile(filename, 'utf8', function(err, body) {
        // Если возникла ошибка
        if(err) {
            // Это не ошибка отсутствия файла
            if(err.code !== 'ENOENT') {
                return callback(err);
            }
            
            // начинаем грузить файлик
            return download(url, filename, function(err, body) {
                if(err) {
                    return callback(err);
                }
                // Ссылки парсим
                spiderLinks(url, body, nesting, callback);
            });
        }
        
        // Просто парсим ссылки для проверки
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