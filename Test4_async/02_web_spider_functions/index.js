"use strict";

const request = require('request');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const utilities = require('./utilities');

function saveFile(filename, contents, callback) {
  // Создаем папки если не существуют
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
  
  // Выполняем загрузку
  request(url, (err, response, body) => {
    if(err) {
      return callback(err);
    }
    
    // Данные загружены, пытаемся сохранить эти данные
    saveFile(filename, body, err => {
      if(err) {
        return callback(err);
      }
      console.log(`Downloaded and saved: ${url}`);
      callback(null, body);
    });
  });
}

function spider(url, callback) {
  // Получаем имя файла по url
  const filename = "result/" +  utilities.urlToFilename(url);
  // Проверяем, есть ли файлик
  fs.exists(filename, exists => {
    // Если существует, то сразу коллбек
    if(exists) {
      return callback(null, filename, false);
    }
    
    // Если нету - начинаем загрузку
    download(url, filename, err => {
      if(err) {
        return callback(err);
      }
      
      // Коллбек завершения загрузки
      callback(null, filename, true);
    })
  });
}

spider(process.argv[2], (err, filename, downloaded) => {
  if(err) {
    console.log(err);
  } else if(downloaded){
    console.log(`Completed the download of "${filename}"`);
  } else {
    console.log(`"${filename}" was already downloaded`);
  }
});
