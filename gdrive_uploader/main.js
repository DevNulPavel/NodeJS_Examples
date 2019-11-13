"use strict";


// http://datalytics.ru/all/rabotaem-s-api-google-drive-s-pomoschyu-python/
// https://developers.google.com/drive/api/v3/reference/files
// 

const readline = require("readline");
const commander = require("commander")
const googleapis = require("googleapis");
const google_auth = require("./google_auth");
const uploader = require("./uploader");


const KEY_FILE = __dirname + "/keys_test.json";
const UPLOAD_FILE = __dirname + "/index.js";
const TARGET_FOLDER_ID = "1ziMxgtRz9gzwm7NVEO--WxPXY5rcxpJY";
const SCOPES = [
    "https://www.googleapis.com/auth/drive.file",     // Работа с файлами, созданными текущим приложением, https://developers.google.com/identity/protocols/googlescopes#driveactivityv2
    //"https://www.googleapis.com/auth/drive",        // Работа со всеми файлами на диске
];

async function main(){
    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    const commaSeparatedList = (value, dummyPrevious) => {
        return value.split(",").filter((val)=>{
            return val.length > 0;
        });
    }
    commander.requiredOption("-i, --input_files <comma_separeted_files_path>", "Input files for uploading: -i 'file1','file2'", commaSeparatedList);
    commander.requiredOption("-t, --target_folder_id <folder_id>", "Target Google drive folder ID");
    commander.parse(process.argv);
    const filesForUploading = commander.input_files;
    const targetFolderId = commander.target_folder_id;

    // Тестовый код параметров отгрузки
    //const targetFolderId = TARGET_FOLDER_ID;
    //const filesForUploading = UPLOAD_FILE;

    // Создание аутентификаии сразу из файлика
    //const authClient = await createAuthClientFromFile(KEY_FILE, SCOPES);

    // Тестовый код для получения параметров из файлика
    const jsonData = require(KEY_FILE);
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
    const authClient = await google_auth.createAuthClientFromInfo(email, keyId, key, SCOPES);

    // Отгружаем файлики
    console.log("Start uploading...")
    const progressCb = (progress)=>{
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`Upload progress: ${Math.round(progress)}%`);
    }
    const uploadResults = await uploader.uploadWithAuth(authClient, targetFolderId, filesForUploading, progressCb);
    console.log("");
    
    // Выводим результаты
    for(let i = 0; i < uploadResults.length; i++){
        const uploadInfo = uploadResults[i];
        console.log(`Download url for file "${uploadInfo.srcFilePath}": ${uploadInfo.webContentLink}`);
        //console.log(`Web view url for file "${uploadInfo.srcFilePath}": ${uploadInfo.webViewLink}`); 
    }
}

main();
