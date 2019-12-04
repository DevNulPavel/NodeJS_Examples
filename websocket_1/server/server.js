"use strict";

const path = require("path");
const express = require("express");
const ws = require("ws");

const HTTP_PORT = 80;
const WS_PORT = 8888;

let wsServer = null;
let httpServer = null;
const messages = [];

function runWebSocketServer(){
    const server = new ws.Server({
        port: WS_PORT
    });
    wsServer = server;

    server.on("connection", (socket, request)=>{
        console.log("connected");
        
        // Отправляем старые сообщения при подключении
        messages.forEach((message)=>{
            socket.send(message);
        });

        // Назначаем обработчики данных в сокете
        socket.on("message", (data)=>{
            messages.push(data);

            server.clients.forEach((client)=>{
                client.send(data);
            });
        });
        socket.on("close", (code, reason)=>{
            console.log("close");
        });
        socket.on("open", ()=>{
            console.log("open");
        });
        socket.on("ping", (data)=>{
            console.log("ping");
        });
        socket.on("pong", (data)=>{
            console.log("pong");
        });
        socket.on("upgrade", (request)=>{
            console.log("request");
        });
    });
    server.on("listening", ()=>{
        console.log("listening");
    });
    server.on("error", (err)=>{
        console.log(err);
    });
    server.on("headers", (headers, request)=>{
        console.log("headers");
    });
}

function runHttpServer(){
    const httpApp = express();
    httpServer = httpApp;

    httpApp.use(express.static("./client"));

    httpApp.listen(HTTP_PORT, (err)=>{
        if(err){
            throw err;
        }

        console.log("Server is listening");
    });
}

function runServer(){
    runWebSocketServer();
    runHttpServer();
}

function stopServer(cb){
    if(wsServer !== null){
        wsServer.close(()=>{
            if(httpServer !== null && httpServer.close !== undefined) {
                httpServer.close();
            }
            cb();
        });
    }
}

module.exports = {
    runServer,
    stopServer
};