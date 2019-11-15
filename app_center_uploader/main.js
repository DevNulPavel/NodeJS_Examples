"use strict";

const fs = require("fs");
const util = require("util");
const readline = require("readline");
const commander = require("commander")
const uploader = require("./uploader");


async function main(){    
    // TODO: Тестовый код для получения параметров аутентификации из файлика
    /*//const jsonData = require("./keys_test_android.json");
    const jsonData = require("./keys_test_ios.json");
    const accessToken = jsonData.token;
    const appName = jsonData.app_name;
    const appOwnerName = jsonData.app_owner_name;*/

    // Пробуем получить из переменных окружения данные для авторизации
    const accessToken = process.env["APP_CENTER_ACCESS_TOKEN"];
    const appName = process.env["APP_CENTER_APP_NAME"];
    const appOwnerName = process.env["APP_CENTER_APP_OWNER_NAME"];
    if (!accessToken || !appName || !appOwnerName){
        throw Error("Missing enviroment variables");
        //console.error("Missing enviroment variables");
        //return;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    /*commander.requiredOption("-i, --input_file <build_file>", "Input file for uploading");
    commander.option("-s, --ios_symbols <*.app.dSYM.zip>", "Input symbols archive for uploading");
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
    
    const withSymbolsUploading = uploader.isSymbolsUploadingSupported(inputFile, symbolsFile);
    console.log(withSymbolsUploading);

    let progressCb = undefined;
    if(process.stdout.isTTY){ // Нужен ли интерактивный режим?
        let totalBytes = 0;
        if(withSymbolsUploading){
            const statPromisified = util.promisify(fs.stat);
            const prom1 = statPromisified(inputFile);
            const prom2 = statPromisified(symbolsFile);
            const [stat1, stat2] = await Promise.all([prom1, prom2]);
            totalBytes = stat1.size + stat2.size;
            //console.log(totalBytes);
        }else{
            totalBytes = fs.statSync(inputFile);
        }

        progressCb = (totalBytesProgress)=>{
            const progress = (totalBytesProgress / totalBytes) * 100;
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Upload progress: ${Math.round(progress)}%`);
        };
    }
    const uploadResults = await uploader.uploadToHockeyApp(accessToken, appName, appOwnerName, inputFile, withSymbolsUploading, symbolsFile, progressCb);
    console.log("");
    console.log(uploadResults);
}

main();