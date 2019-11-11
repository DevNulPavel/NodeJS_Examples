"use strict";

const fs = require('fs');
const zlib = require('zlib');

const file = process.argv[2];

const readScream = fs.createReadStream(file);
const gzipStream = zlib.createGzip();
const fileWriteStream = fs.createWriteStream(file + '.gz');

const completeCallback = () => {
    console.log('File successfully compressed');
}

readScream.pipe(gzipStream).pipe(fileWriteStream).on('finish', completeCallback);
