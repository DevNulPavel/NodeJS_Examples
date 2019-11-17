"use strict";

const fs = require("fs");
const util = require("util");
const readline = require("readline");
const commander = require("commander")
const uploader = require("./uploader");


async function main(){
    // TODO: Тестовый код для получения параметров аутентификации из файлика
    const jsonData = require("./keys_test.json");
    const serverName = jsonData.server_name;
    const user = jsonData.user_name;
    const pass = jsonData.user_pass;
    const keyFilePath = jsonData.key_file_path;
    const appName = jsonData.app_name;
    const appVersion = jsonData.app_version;

    // Пробуем получить из переменных окружения данные для авторизации
    /*const accessToken = process.env["APP_CENTER_ACCESS_TOKEN"];
    const appName = process.env["APP_CENTER_APP_NAME"];
    const appOwnerName = process.env["APP_CENTER_APP_OWNER_NAME"];
    if (!accessToken || !appName || !appOwnerName){
        throw Error("Missing enviroment variables");
        //console.error("Missing enviroment variables");
        //return;
    }*/

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    /*const commaSeparatedList = (value, dummyPrevious) => {
        return value.split(",").filter((val)=>{
            return val.length > 0;
        });
    };
    commander.requiredOption("-i, --input_files <input files>", "Input files for uploading: -i 'file1','file2'", commaSeparatedList);
    commander.requiredOption("-d, --dir_on_server <target_dir>", "Input symbols archive for uploading");
    commander.parse(process.argv);
    const filePaths = commander.input_files;
    const serverDir = commander.dir_on_server;*/

    // TODO: Тестовый код параметров отгрузки
    const filePaths = [
        "/Users/devnul/Desktop/download.jpeg", 
        "/Users/devnul/Desktop/screenshot.png"
    ];
    const serverDir = "~/testResultFolder";

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    let progressCb = undefined;
    if(process.stdout.isTTY){ // Нужен ли интерактивный режим?
        let totalBytes = 0;

        const statPromisified = util.promisify(fs.stat);
        const statsProms = filePaths.map((file)=>{
            return statPromisified(file);
        });
        const stats = await Promise.all(statsProms);
        stats.forEach((stat)=>{
            totalBytes += stat.size;
        });

        progressCb = (totalBytesProgress)=>{
            const progress = (totalBytesProgress / totalBytes) * 100;
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Upload progress: ${Math.round(progress)}%`);
        };
    }
    const uploadResults = await uploader.uploadToSamba(serverName, user, pass, keyFilePath, serverDir, filePaths, appName, appVersion, progressCb);
    console.log("");
    console.log(uploadResults);
}

main();