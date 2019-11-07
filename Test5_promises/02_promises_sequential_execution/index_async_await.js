"use strict";

const path = require('path');
const fs = require('fs');
const utilities = require('./utilities');

const requestProm = utilities.promisify(require('request'));
const mkdirpProm = utilities.promisify(require('mkdirp'));
const readFileProm = utilities.promisify(fs.readFile);
const writeFileProm = utilities.promisify(fs.writeFile);


// Данная функция без async, так как она вручную отдает promise
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
    const linkCb = link => {
        // После окончания текущего обещания - будем стартовать обработку следующего
        const nextLinkSpiderCb = async () => {
            // Запускаем новую стадию парсинга c ожиданием
            await spider(link, nesting - 1);
        }
        promise = promise.then(nextLinkSpiderCb);
    };
    links.forEach(linkCb);
    
    // Возвращаем получившуюся цепочку загрузки ссылок
    return promise;
}

async function download(url, filename) {
    console.log(`Downloading ${url}`);

    const responce = await requestProm(url);
    // Сохраняем тело ответа для дальнейшего разбора
    const body = responce.body;
    // Создаем папку
    await mkdirpProm(path.dirname(filename));
    // Записываем тело в файлик
    await writeFileProm(filename, body); 

    return body;
}

async function spider(url, nesting) {
    let filename = "result/" + utilities.urlToFilename(url);
    console.log(`File path: ${filename}`);

    try{
        // Читаем файлик
        const body = await readFileProm(filename, 'utf8');
        // Если файлик существует
        // То разбираем его на ссылки
        await spiderLinks(url, body, nesting);
    }catch(err){
        // если ошибка не отсутствие файлика - тогда выбрасываем исключение
        if(err.code !== 'ENOENT') {
            throw err;
        }
        
        // Иначе - начинаем загрузку файлика
        const body = await download(url, filename);

        // Запускаем в работу разбор тела и поиск ссылок
        await spiderLinks(url, body, nesting);
    }
}

//const TEST_URL = process.argv[2];
const TEST_URL = "http://habrahabr.ru";
(async ()=>{
    try{
        await spider(TEST_URL, 1);
        console.log('Download complete')
    }catch(err){
        console.log(err);
    }
})();
