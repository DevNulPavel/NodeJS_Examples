"use strict";

const net = require('net');

var activeSockets = new Set();
var server = null;
var timerHandler = null;

function onServerStarted(){
    console.log("Server started");
    if (timerHandler == null){
        timerHandler = setInterval(sendPeriodicMessage, 3000);
    }
}

function onConnected(socket){
    console.log("New client connected");

    activeSockets.add(socket);

    socket.on("data", (data) => {
        console.log("Cliend data received: " + data.slice(0, -1)); // Символ переноса строки убираем
        //var testBuf = new Buffer(5);
        if (data.includes("stop") == true) {
            console.log("Try to stop timer");
            if(timerHandler != null){
                clearInterval(timerHandler);
                timerHandler = null;
            }
        } else if (data.includes("start") == true) {
            console.log("Try to start timer");
            if(timerHandler == null){
                timerHandler = setInterval(sendPeriodicMessage, 3000);
            }
        }
        socket.write(data, "utf8", ()=>{
            console.log("Cliend write callback");
        });
    });
    socket.on("drain", () => {
        console.log("Cliend drain");
    });
    socket.on("timeout", () => {
        activeSockets.delete(socket);
        console.log("Cliend timeout");
    });
    socket.on("error", (err) => {
        activeSockets.delete(socket);
        console.log("Cliend error");
    });
    socket.on("end", () => {
        activeSockets.delete(socket);
        console.log("Cliend disconnected");
    });
}

function onServerError(err){
    console.log("Server error " + err);
}

function sendPeriodicMessage(){
    for (let socket of activeSockets) {
        socket.write("test\n", "utf8", ()=>{
            console.log("Cliend write callback");
        });
    }
}

server = net.createServer(onConnected);
server.on("error", onServerError);
server.listen(9999, onServerStarted);