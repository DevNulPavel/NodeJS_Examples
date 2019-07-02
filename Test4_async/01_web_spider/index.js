"use strict";

// Получаем модуль request
const request = require('request');
// Модуль файловой системы
const fs = require('fs');
// Специальный модуль для рекурсивного создания директорий
const mkdirp = require('mkdirp');
// Модуль пути
const path = require('path');
// Модуль наших утилит
const utilities = require('./utilities');

function spider(url, callback) {
  // Парсим адрес в имя файла
  const filename = utilities.urlToFilename(url);
  // Проверяем наличие файла результат
  fs.exists("result/" + filename, exists => {
    // Если файла нету, то начинаем загрузку
    if(!exists) {
      console.log(`Downloading ${url}`);
      // Выполняем загрузку файла
      request(url, (err, response, body) => {
        // Если у нас ошибка
        if(err) {
          callback(err);
        } else {
          // Если все нормально, то создаем нужные папки
          mkdirp("result/" + path.dirname(filename), err => {
            // Папки создали, можно записывать данные в файл
            if(err) {
              callback(err);
            } else {
              // Пишем в файлик
              fs.writeFile("result/" + filename, body, err => {
                // Если все ок, то вызываем коллбек
                if(err) {
                  callback(err);
                } else {
                  callback(null, filename, true);
                }
              });
            }
          });
        }
      });
    } else {
      callback(null, filename, false);
    }
  });
}

// Пробуем выкачать данные, вызываем коллбек при завершении
spider(process.argv[2], (err, filename, downloaded) => {
  if(err) {
    console.log(err);
  } else if(downloaded){
    console.log(`Completed the download of "${filename}"`);
  } else {
    console.log(`"${filename}" was already downloaded`);
  }
});
