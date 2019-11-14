"use strict";

const readline = require("readline");
const commander = require("commander")
const uploader = require("./uploader");


async function main(){    
    // TODO: Тестовый код для получения параметров аутентификации из файлика
    //const jsonData = require("./keys_test_android.json");
    const jsonData = require("./keys_test_ios.json");
    const accessToken = jsonData.token;
    const appName = jsonData.app_name;
    const appOwnerName = jsonData.app_owner_name;

    // Пробуем получить из переменных окружения данные для авторизации
    /*let clientId = process.env["AMAZON_CLIENT_ID"];
    let clientSecret = process.env["AMAZON_CLIENT_SECRET"];
    let appId = process.env["AMAZON_APP_ID"];
    if (!clientId || !clientSecret || !appId){
        throw Error("Missing enviroment variables");
        //console.error("Missing enviroment variables");
        //return;
    }*/

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    /*commander.requiredOption("-i, --input_file <build_file>", "Input file for uploading");
    commander.requiredOption("-s, --ios_symbols <*.app.dSYM.zip>", "Input symbols archive for uploading");
    commander.parse(process.argv);
    const inputFile = commander.input_file;
    const symbolsFile = commander.ios_symbols;*/

    // TODO: Тестовый код параметров отгрузки
    // iOS
    const inputFile = "/Users/devnul/Downloads/Island2-11.15.0_314-AppStore-20191112_164601-821dc9f.ipa";
    const symbolsFile = "/Users/devnul/Downloads/Island2-11.15.0_314-AppStore-20191112_164601-821dc9f.xcarchive/dSYMs/Island2.app.dSYM.zip";
    // Android
    //const inputFile = "/Users/devnul/Downloads/Island2-arm64-hockey-11.15.0-314-12112019_1645-821dc9f0.apk";
    //const symbolsFile = "/Users/devnul/Downloads/hockey-arm32-libIsland2.zip";

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    let progressCb = undefined;
    if(process.stdout.isTTY){ // Нужен ли интерактивный режим?
        progressCb = (progress)=>{
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Upload progress: ${Math.round(progress)}%`);
        };
    }
    const uploadResults = await uploader.uploadToHockeyApp(accessToken, appName, appOwnerName, inputFile, symbolsFile, progressCb);
    console.log("");
    console.log(uploadResults);
}

main();