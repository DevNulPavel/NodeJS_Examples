"use strict";

const udp = require('dgram');


const client = udp.createSocket('udp4');
var activeBufferIndex = -1;
var receivedDataBuffer = rebuildBuffer(0, 0, 0);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function rebuildBuffer(bufferIndex, totalSize, chunksCount){
    var buf = Buffer.alloc(totalSize, 0);
    buf.bufferIndex = bufferIndex;
    buf.chunksCount = chunksCount;
    buf.receivedChunks = new Set();
    buf.processed = false;
    return buf;
}

function handleMessageFull(fullData){
    console.log("Message with index " + fullData.bufferIndex + " received");
}

function setupClient(){
    client.on("listening", () => {
        console.log("listen");
    });
    
    client.on("message", (msg, info) => {
        //console.log("Data from " + info.address + ": " + msg);
        //console.log("Data from " + info.address);
        
        var byteOffset = 0;
    
        var curBufferIndex = msg.readInt16BE(byteOffset);
        byteOffset += 2;
    
        var totalSize = msg.readInt32BE(byteOffset);
        byteOffset += 4;
        
        var chunksCount = msg.readInt32BE(byteOffset);
        byteOffset += 4;
    
        var chunkIndex = msg.readInt32BE(byteOffset);
        byteOffset += 4;
    
        var chunkBegin = msg.readInt32BE(byteOffset);
        byteOffset += 4;
    
        var chunkSize = msg.readInt16BE(byteOffset);
        byteOffset += 2;
    
        var data = msg.slice(byteOffset, chunkSize)
    
        if (curBufferIndex > activeBufferIndex){
            activeBufferIndex = curBufferIndex;
            receivedDataBuffer = rebuildBuffer(curBufferIndex, totalSize, chunksCount);
        }
    
        data.copy(receivedDataBuffer, chunkBegin);
        receivedDataBuffer.receivedChunks.add(chunkIndex);
        if (receivedDataBuffer.receivedChunks.size == receivedDataBuffer.chunksCount && receivedDataBuffer.processed == false){
            receivedDataBuffer.processed = true;
            handleMessageFull(receivedDataBuffer);
        }
    });
    
    client.on("error", (err) => {
        console.log("Error: " + err);
    });
    
    client.on("close", () => {
        console.log("Closed");
    });
}

function runClient(){
    client.bind(9998);

    client.send(Buffer.from('start'), 9999, "localhost", (err) => {
    });
    
    setInterval(()=>{
        client.send("ping", 9999, "localhost", (err) => {
        }); 
    }, 1000);    
}

function run(){
    setupClient()
    runClient()
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports.run = run