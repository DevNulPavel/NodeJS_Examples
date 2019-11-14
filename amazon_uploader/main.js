"use strict";

const readline = require("readline");
const commander = require("commander")
const uploader = require("./uploader");


//http://frontendcollisionblog.com/javascript/2015/12/26/using-nodejs-to-upload-app-to-google-play.html
//https://googleapis.dev/nodejs/googleapis/latest/androidpublisher/classes/Resource$Edits$Apks-1.html#upload
//https://stackoverflow.com/questions/48274009/cant-upload-apk-to-google-play-developer-via-publisher-api


async function main(){    
    // TODO: Тестовый код для получения параметров аутентификации из файлика
    /*const jsonData = require("./keys_prod_island2_2.json");
    const clientId = jsonData.client_id;
    const clientSecret = jsonData.client_secret;
    const appId = jsonData.app_id;*/

    // Пробуем получить из переменных окружения данные для авторизации
    let clientId = process.env["AMAZON_CLIENT_ID"];
    let clientSecret = process.env["AMAZON_CLIENT_SECRET"];
    let appId = process.env["AMAZON_APP_ID"];
    if (!clientId || !clientSecret || !appId){
        throw Error("Missing enviroment variables");
        //console.error("Missing enviroment variables");
        //return;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    commander.requiredOption("-i, --input_file <input apk>", "Input file for uploading");
    commander.parse(process.argv);
    const inputFile = commander.input_file;

    // TODO: Тестовый код параметров отгрузки
    /*const inputFile = "test.apk";
    const targetTrack = "internal";
    const packageName = "com.gameinsight.gplay.mmanor";*/

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    let progressCb = undefined;
    if(process.stdout.isTTY){ // Нужен ли интерактивный режим?
        progressCb = (progress)=>{
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Upload progress: ${Math.round(progress)}%`);
        };
    }
    const uploadResults = await uploader.uploadBuildOnServer(clientId, clientSecret, appId, inputFile, progressCb);
    console.log("");
    console.log(uploadResults);
}

main();