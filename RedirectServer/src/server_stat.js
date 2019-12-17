"use strict";

//const fs = require("fs");
const express = require("express");
const os = require("os-utils");

//https://www.npmjs.com/package/node-os-utils
//https://www.npmjs.com/package/os-utils


function renderServerStat(req, res){
    os.cpuUsage( callback );
    os.cpuFree( callback );
    os.platform();
    os.countCPUs()
    os.freemem()
    os.totalmem()
    os.freememPercentage()
    os.sysUptime();
    os.processUptime() 
    os.loadavg(1)
    os.loadavg(5)
    os.loadavg(15)

    res.render("server_stats");
}

function renderServerStatForServer(req, res){
    const pathParameter = req.params["server_name"];
    const data = {
        message: pathParameter
    };
    res.render("debug_message", data);
}

function setupHttp(httpApp){
    // Установка Middleware обработчиков для путей
    httpApp.use("/server_stat", (req, res, next)=>{
        //console.log("Server stat middleware 1");
        //res.status(404).send("Not found"); // Можно кидать сообщение об ошибке
        //req.metainfo = {test: 123}; // Можно добавлять разную метанформацию
        next();
    });

    // Определяем Router для статистики сервера, Router нужен для обработки дочерних путей
    const productRouter = express.Router();
    productRouter.get("/", renderServerStat);
    productRouter.get("/:server_name", renderServerStatForServer); // Так же мы можем задействовать параметры в пути, они помечаются двоеточием
    httpApp.use("/server_stat", productRouter);
}

module.exports = {
    setupHttp: setupHttp
};    

