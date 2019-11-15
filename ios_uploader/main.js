"use strict";

const fs = require("fs");
const util = require("util");
const readline = require("readline");
const commander = require("commander")
const uploader = require("./uploader");


async function main(){
    // TODO: Тестовый код для получения параметров аутентификации из файлика
    const jsonData = require("./keys_test.json");
    const user = jsonData.api_token;
    const pass = jsonData.slack_channel;

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
    const ipaFilePath = "";

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const outRes = await uploader.uploadToIOSAppStore(user, pass, ipaFilePath);
    console.log(outRes);
}

main();