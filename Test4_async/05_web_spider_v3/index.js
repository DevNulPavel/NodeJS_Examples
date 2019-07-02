"use strict";

const request = require('request');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const utilities = require('./utilities');

let spidering = new Map();

function spiderLinks(currentUrl, body, nesting, callback) {
    // Если дошли до максимальной глубины, то просто выполняем коллбек
    if(nesting === 0) {
        return process.nextTick(callback);
    }
    
    // Получаем все возможные ссылки со страницы
    const links = utilities.getPageLinks(currentUrl, body);
    if(links.length === 0) {
        return process.nextTick(callback);
    }
    
    let completed = 0;
    let hasErrors = false;
    
    function done(err) {
        if(err) {
            hasErrors = true;
            return callback(err);
        }
        if(++completed === links.length && !hasErrors) {
            return callback();
        }
    }
    
    // Для каждой ссылки начинаем снова скачивать
    links.forEach(function(link) {
        spider(link, nesting - 1, done);
    });
}

function saveFile(filename, contents, callback) {
    // Создаем нужную папку для сохранения
    mkdirp(path.dirname(filename), err => {
        if(err) {
            return callback(err);
        }
        // Если все прошло успешно, тогда сохранем в файл данные
        fs.writeFile(filename, contents, callback);
    });
}

function download(url, filename, callback) {
    console.log(`Downloading ${url}`);

    // Начинаем загрузку 
    request(url, (err, response, body) => {
        if(err) {
            return callback(err);
        }

        // После успешной загрузки выполняем сохранение файла
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
    // Если данный url мы уже обрабатываем, то не вызываем повторное скачивание
    if(spidering.has(url)) {
        return process.nextTick(callback);
    }

    // Сохраняем адрес как скачиваемый
    spidering.set(url, true);
    
    // Получаем имя файла
    const filename = "result/" + utilities.urlToFilename(url);
    
    // Читаем файл, если он есть
    fs.readFile(filename, 'utf8', function(err, body) {
        if(err) {
            // Если у нас ошибка чтения файла
            if(err.code !== 'ENOENT') {
                return callback(err);
            }
            
            // Если файла нету - грузим
            return download(url, filename, function(err, body) {
                if(err) {
                    return callback(err);
                }

                // Если все успешно загрузилось, тогда парсим ссылки
                spiderLinks(url, body, nesting, callback);
            });
        }
        
        // Если файл уже есть, то парсим ссылки
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