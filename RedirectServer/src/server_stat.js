"use strict";

//const fs = require("fs");
//const util = require("util");
const express = require("express");
const os = require("os-utils");

//https://www.npmjs.com/package/node-os-utils
//https://www.npmjs.com/package/os-utils

async function getStats(){
    //const cpuUsageFunc = util.promisify(os.cpuUsage);
    //const cpuFreeFunc = util.promisify(os.cpuFree);

    const cpuUsageProm = new Promise((resolve) =>{
        os.cpuUsage((percent)=>{
            resolve(percent);
        });
    });
    const cpuFreeProm = new Promise((resolve) =>{
        os.cpuFree((percent)=>{
            resolve(percent);
        });
    });

    const [cpuUsage, cpuFree] = await Promise.all([cpuUsageProm, cpuFreeProm]);
    const platform = os.platform();
    //const totalCPU = os.countCPUs();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const freeMemPercent = os.freememPercentage();
    const uptime = os.sysUptime();
    const procUptime = os.processUptime();
    const avg1 = os.loadavg(1);
    const avg5 = os.loadavg(5);
    const avg15 = os.loadavg(15);

    return {
        cpuUsage,
        cpuFree,
        platform,
        //totalCPU,
        freeMem,
        totalMem,
        freeMemPercent,
        uptime,
        procUptime,
        avg1,
        avg5,
        avg15
    };
}

async function renderServerStat(req, res){
    const data = await getStats();
    res.render("server_stats", data);
}

function renderServerStatForServer(req, res){
    const pathParameter = req.params["server_name"];
    const data = {
        message: pathParameter
    };
    res.render("debug_message", data);
}

async function getServerStatJson(req, res){
    const data = await getStats();
    res.send(data);
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

    // RestAPI for stat
    httpApp.get("/api/server_stat", getServerStatJson);
}

module.exports = {
    setupHttp: setupHttp
};    

