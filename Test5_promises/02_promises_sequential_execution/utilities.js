"use strict";

const urlParse = require('url').parse; // Получаем только нужную функцию
const urlResolve = require('url').resolve; // Получаем только нужную функцию
const slug = require('slug');
const path = require('path');
const cheerio = require('cheerio');


module.exports.urlToFilename = function urlToFilename(url) {
    // Парсим адрес
    let parsedUrl = urlParse(url);
    // Разделяем адрес на отдельные части
    let urlPath = parsedUrl.path.split('/')
        .filter(component => { return !!component; }) // TODO: ???
        .map(component => { return slug(component); })
        .join('/');
    // Полуачаем имя файла
    let filename = path.join(parsedUrl.hostname, urlPath);
    if(!path.extname(filename).match(/htm/)) {
        filename += '.html';
    }
    return filename;
};

module.exports.getLinkUrl = function getLinkUrl(currentUrl, element) {
    let link = urlResolve(currentUrl, element.attribs.href || ""); // Если есть ссылка, иначе берем пустую строку
    let parsedLink = urlParse(link);
    let currentParsedUrl = urlParse(currentUrl);
    if(parsedLink.hostname !== currentParsedUrl.hostname || !parsedLink.pathname) {
        return null;
    }
    return link;
};

module.exports.getPageLinks = function getPageLinks(currentUrl, body) {
    return [].slice.call(cheerio.load(body)('a')) // Получаем все ссылки
        .map(element => module.exports.getLinkUrl(currentUrl, element)) // получаем относительные ссылки
        .filter(element => !!element);
};

module.exports.promisify = function(callbackBasedApi) {
    return function promisified() {
        let args = [].slice.call(arguments);
        return new Promise((resolve, reject) => {
        args.push((err, result) => {
            if(err) {
                return reject(err);
            }
            if(arguments.length <= 2) {
                resolve(result);
            } else {
                resolve([].slice.call(arguments, 1));
            }
        });
        callbackBasedApi.apply(null, args);
        });
    }
};
