"use strict";

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');

const server = http.createServer((req, res) => {
    const filename = req.headers.filename;
    console.log('File request received: ' + filename);

    const unzipStream = zlib.createGunzip();
    const sriteStream = fs.createWriteStream(filename);
    const finishCallback = () => {
        res.writeHead(201, {'Content-Type': 'text/plain'});
        res.end('That\'s it\n');
        console.log(`File saved: ${filename}`);
    };

    req.pipe(unzipStream).pipe(sriteStream).on('finish', finishCallback);
});


server.listen(3000, () => {
    console.log('Listening');
});
