"use strict";

const udp = require('dgram');

const clients = new Map();
const server = udp.createSocket("udp4")

server.on("listening", () => {
    console.log("listen");
});

server.on("message", (data, info) => {
    console.log("Data from " + info.address + ": " + data);
    var addr = info.address;
    var port = info.port;
    var time = Date.now();
    var key = addr + ":" + port;
    var val = { addr, port, time };

    if(data.includes('stop')){
        clients.delete(key);
    }else{
        clients.set(key, val);
    }
});

server.on("error", (err) => {
    console.log("Error: " + err);
});

server.on("close", () => {
    console.log("Closed");
});

server.bind(9999);

var bufferIndex = 0;
var totalBufferSize = 1024*1024;
var fullBuffer = Buffer.alloc(totalBufferSize, 0xAA);
var chunkSize = 256;
var totalChunksCount = totalBufferSize / chunkSize;
var curChunkBegin = 0;

setInterval(()=>{
    if (clients.size == 0){
        return;
    }

    for (var i = 0; i < 128; i++){
        var dataForSend = fullBuffer.slice(curChunkBegin, curChunkBegin + chunkSize);
        var chunkIndex = curChunkBegin;
        curChunkBegin += chunkSize;
    
        var metaInfoSize = 18;
        var msg = Buffer.alloc(metaInfoSize + chunkSize);
    
        var byteOffset = 0;
        byteOffset = msg.writeInt16BE(bufferIndex, byteOffset);
        byteOffset = msg.writeInt32BE(totalBufferSize, byteOffset);
        byteOffset = msg.writeInt32BE(totalChunksCount, byteOffset);
        byteOffset = msg.writeInt32BE(chunkIndex, byteOffset);
        byteOffset = msg.writeInt32BE(curChunkBegin, byteOffset);
        byteOffset = msg.writeInt16BE(chunkSize, byteOffset);
        dataForSend.copy(msg, byteOffset);
    
        for (let [_, val] of clients){
            server.send(msg, val.port, val.addr, (err)=>{});
        }

        // Старт заново
        if (curChunkBegin + chunkSize > totalBufferSize){
            curChunkBegin = 0;
            bufferIndex += 1;
            console.log("Start again");
        }
    }
}, 50);

setInterval(()=>{
    var timeNow = Date.now();
    let deleteArr = [];
    for (let [key, val] of clients){
        if (val.time + 10000 < timeNow){
            deleteArr.push(key);
        }
    }
    for (let i = 0; i < deleteArr.length; i += 1){
        clients.delete(deleteArr[i]);
        console.log("Client deleted: " + deleteArr[i]);
    }
}, 1000);