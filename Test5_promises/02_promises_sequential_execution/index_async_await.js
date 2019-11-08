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
    const links = utilities.getPageLinks(currentUrl, body).filter((link) => { 
        const valid = typeof(link) == "string";
        return valid;
    });

    // Последовательный вариант
    /*// Перебираем ссылки
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
    return promise;*/
    
    // Параллельный вариант
    /*let promises = [];
    links.forEach((link) =>{
        console.log(link);
        const prom = spider(link, nesting-1);
        promises.push(prom);
    });
    return Promise.all(promises);*/

    // Параллельный вариант с ограничением
    const MAX_PARALLEL_COUNT = 10;
    // Набор активных в данный момент задач
    let activePromises = new Set();
    // Получим коллбек для вызова оповещения о конце всех действий
    let resolveCb;
    let finishPromise = new Promise((resolve)=>{
        resolveCb = resolve;
    });
    // Лямбда запуска новых задач
    const runNewPromise = ()=>{
        // Если все задач окончились, то просто дожидаемся завершения
        if(links.length == 0){
            Promise.all(activePromises).then(resolveCb);
            return;
        }
        // Если превышен порог одновременных задач - не стартуем новые
        if(activePromises.size >= MAX_PARALLEL_COUNT){
            return;
        }
        // Вынимаем новую ссылку
        const link = links.pop();
        // Получаем Promise
        let spiderProm = spider(link, nesting - 1);
        // Добавляем к списку активных
        activePromises.add(spiderProm);
        // При окончании удаляем из списка и пробуем стартануть новую задачу
        spiderProm = spiderProm.then(()=>{
            activePromises.delete(spiderProm);
            runNewPromise();
        });
        // Пытаемся стартануть еще задачу
        runNewPromise();
    };
    runNewPromise();
    return finishPromise;
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
