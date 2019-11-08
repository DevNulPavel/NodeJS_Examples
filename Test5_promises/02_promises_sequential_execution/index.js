"use strict";

const path = require('path');
const fs = require('fs');
const utilities = require('./utilities');

const requestProm = utilities.promisify(require('request'));
const mkdirpProm = utilities.promisify(require('mkdirp'));
const readFileProm = utilities.promisify(fs.readFile);
const writeFileProm = utilities.promisify(fs.writeFile);


function spiderLinks(currentUrl, body, nesting) {
    // Создаем переменную promise, которая будет возвращена
    // Создаем уже готовый promise
    let promise = Promise.resolve();
    // Если глубина закончилась - выходим
    if(nesting === 0) {
        return promise;
    }
    // Получаем список ссылок
    const links = utilities.getPageLinks(currentUrl, body);
    // Перебираем ссылки
    // Послeдовательный вариант
    /*const linkCb = link => {
        // После окончания текущего обещания - будем стартовать обработку следующего
        const nextLinkSpiderCb = () => {
            spider(link, nesting - 1);
        }
        promise = promise.then(nextLinkSpiderCb);
    };
    links.forEach(linkCb);
    // Возвращаем получившуюся цепочку загрузки ссылок
    return promise;*/

    // Параллельный вариант
    let promises = [];
    for (let i in links){
        const spiderProm = spider(links[i], nesting - 1);
        promises.push(spiderProm);
    }
    return Promise.all(promises);
}

function download(url, filename) {
    console.log(`Downloading ${url}`);
    let body;
    const requestCompleteCb = (response) => {
        // Сохраняем тело ответа для дальнейшего разбора
        body = response.body;
        // Создаем папку
        return mkdirpProm(path.dirname(filename));
    };
    const writeCb = () => {
        // Записываем тело в файлик
        writeFileProm(filename, body);
    };
    const bodyReturnCb = () => {
        console.log(`Downloaded and saved: ${url}`);
        return body;
    };
    return requestProm(url).then(requestCompleteCb).then(writeCb).then(bodyReturnCb);
}

function spider(url, nesting) {
    let filename = "result/" + utilities.urlToFilename(url);
    console.log(`File path: ${filename}, url: ${url}`);

    // Если файлик существует
    const loadCallback = (body) => {
        // То разбираем его на ссылки
        spiderLinks(url, body, nesting);
    };
    // Если не существует
    const errorCallback = (err) => {
        // если ошибка не отсутствие файлика - тогда выбрасываем исключение
        if(err.code !== 'ENOENT') {
            throw err;
        }
        
        // Иначе - начинаем загрузку файлика
        const downloadCompleteCb = (body) => {
            // Запускаем в работу разбор тела и поиск ссылок
            spiderLinks(url, body, nesting);
        };
        return download(url, filename).then(downloadCompleteCb);
    };
    return readFileProm(filename, 'utf8').then(loadCallback, errorCallback);
}

//const TEST_URL = process.argv[2];
const TEST_URL = "http://habrahabr.ru"
const succesCb = () => {
    console.log('Download complete')
};
const failCb = err => {
    console.log(err);
};
spider(TEST_URL, 1).then(succesCb).catch(failCb);
