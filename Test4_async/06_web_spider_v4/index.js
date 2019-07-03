"use strict";

const request = require('request');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const utilities = require('./utilities');
const TaskQueue = require('./taskQueue');

let downloadQueue = new TaskQueue(2);
let spidering = new Map();

function spiderLinks(currentUrl, body, nesting, callback) {
    // Если дошли до самого дна, то выходим
    if(nesting === 0) {
        return process.nextTick(callback);
    }
    
    // Получаем ссылки из файла
    const links = utilities.getPageLinks(currentUrl, body);
    if(links.length === 0) {
        return process.nextTick(callback);
    }
    
    // Обохдим параллельно массив всех ссылок
    let completed = 0;
    let hasErrors = false;
    links.forEach(link => {
        // Закидываем в очередь задачу загрузки
        downloadQueue.pushTask(done => {
            spider(link, nesting - 1, err => {
                if(err) {
                    hasErrors = true;
                    return callback(err);
                }
                if(++completed === links.length && !hasErrors) {
                    callback();
                }
                done();
            });
        });
    });
}

function saveFile(filename, contents, callback) {
    // Создаем папку если нужно
    mkdirp(path.dirname(filename), err => {
        if(err) {
            return callback(err);
        }
        // Записываем файл в данные
        fs.writeFile(filename, contents, callback);
    });
}

function download(url, filename, callback) {
    console.log(`Downloading ${url}`);
    // Пробуем загрузить данные
    request(url, (err, response, body) => {
        if(err) {
            return callback(err);
        }

        // Сохраняем данные в файл
        saveFile(filename, body, err => {
            if(err) {
                return callback(err);
            }
            console.log(`Downloaded and saved: ${url}`);
            callback(null, body);
        });
    });
}

function spider(url, nesting, callback) {
    // Проверяем, не задействован ли сейчас данный адрес в скачивании
    if(spidering.has(url)) {
        return process.nextTick(callback);
    }

    // Сохраняем как загруженный
    spidering.set(url, true);
    
    const filename = "result/" + utilities.urlToFilename(url);
    fs.readFile(filename, 'utf8', function(err, body) {
        // Если файл не смогли прочитать
        if(err) {
            // И при этом ошибка - не отсутствие файла
            if(err.code !== 'ENOENT') {
                return callback(err);
            }
            
            // Раз файла действительно нету - значит загружаем
            return download(url, filename, function(err, body) {
                if(err) {
                    return callback(err);
                }
                // Загрузилось успешно - разбираем ссылки в этом файле
                spiderLinks(url, body, nesting, callback);
            });
        }
        
        // Если файлик есть - просто разбираем ссылки в файле ля проверки
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