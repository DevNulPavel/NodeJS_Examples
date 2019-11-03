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

setInterval(()=>{
     for (let [_, val] of clients){
        server.send("test", val.port, val.addr, (err)=>{});
     }
}, 250);

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