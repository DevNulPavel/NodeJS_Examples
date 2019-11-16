"use strict";

const fs = require("fs");
const commander = require("commander");
const readline = require("readline");
const google_auth = require("./google_auth");
const uploader = require("./uploader");


//http://frontendcollisionblog.com/javascript/2015/12/26/using-nodejs-to-upload-app-to-google-play.html
//https://googleapis.dev/nodejs/googleapis/latest/androidpublisher/classes/Resource$Edits$Apks-1.html#upload
//https://stackoverflow.com/questions/48274009/cant-upload-apk-to-google-play-developer-via-publisher-api


async function main(){    
    // Создание аутентификаци сразу из файлика
    //const authClient = await createAuthClientFromFile(KEY_FILE, ["https://www.googleapis.com/auth/androidpublisher"]);

    // TODO: Тестовый код для получения параметров аутентификации из файлика
    const jsonData = require("./keys_prod.json");
    const email = jsonData.client_email;
    const keyId = jsonData.private_key_id;
    const key = jsonData.private_key;

    // Пробуем получить из переменных окружения данные для авторизации
    /*let email = process.env["GOOGLE_SERVICE_EMAIL"];
    let keyId = process.env["GOOGLE_KEY_ID"];
    let key = process.env["GOOGLE_KEY"];
    if (!email || !keyId || !key){
        throw Error("Missing enviroment variables");
    }*/

    // Создание аутентифицации из параметров
    const authClient = await google_auth.createAuthClientFromInfo(email, keyId, key, ["https://www.googleapis.com/auth/androidpublisher"]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    /*commander.requiredOption("-i, --input_file <input apk or aab path>", "Input file for uploading");
    commander.requiredOption("-t, --target_track <track name>", "Target track name ('internal' for ex.)");
    commander.requiredOption("-p, --package_name <package_name>", "Package name ('com.gameinsight.gplay.mmanor' for ex.)");
    commander.parse(process.argv);
    const inputFile = commander.input_file;
    const targetTrack = commander.target_track;
    const packageName = commander.package_name;*/

    // TODO: Тестовый код параметров отгрузки
    const inputFile = "test.aab";
    const targetTrack = "internal";
    const packageName = "com.gameinsight.gplay.mmanor";

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    let progressCb = undefined;
    if(process.stdout.isTTY){ // Нужен ли интерактивный режим?
        const totalBytes = fs.statSync(inputFile);
        progressCb = (totalBytesProgress)=>{
            const progress = (totalBytesProgress / totalBytes) * 100;
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Upload progress: ${Math.round(progress)}%`);
        };
    }
    await uploader.uploadBuildWithAuth(authClient, packageName, inputFile, targetTrack, progressCb);
    console.log("");
}

main();