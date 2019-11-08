"use strict";

const fs = require('fs');
const zlib = require('zlib');
const http = require('http');
const path = require('path');

//const file = process.argv[2];
//const server = process.argv[3];

const file = "README.txt";
const server = "localhost";

// Поток чтения
const readStream = fs.createReadStream(file);
// Поток сжатия
const gzipStream = zlib.createGzip();
// Открываем запрос к серверу
const options = {
    hostname: server,
    port: 3000,
    path: '/',
    method: 'PUT',
    headers: {
        filename: "new_" + path.basename(file),
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'gzip'
    }
};
const serverRespCallback = (res) => {
    console.log('Server response: ' + res.statusCode);
};
const req = http.request(options, serverRespCallback);
// Коллбек завершения
const finishCb = () => {
    console.log('File successfully sent');
};
readStream.pipe(gzipStream).pipe(req).on('finish', finishCb);
