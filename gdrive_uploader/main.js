"use strict";


// http://datalytics.ru/all/rabotaem-s-api-google-drive-s-pomoschyu-python/
// https://developers.google.com/drive/api/v3/reference/files
// https://developers.google.com/identity/protocols/googlescopes#driveactivityv2

const commander = require("commander")
const googleapis = require("googleapis");

const uploader = require("./uploader.js");


const KEY_FILE = __dirname + "/keys_test.json";
const UPLOAD_FILE = __dirname + "/index.js";
const TARGET_FOLDER_ID = "1ziMxgtRz9gzwm7NVEO--WxPXY5rcxpJY";
const SCOPES = [
    "https://www.googleapis.com/auth/drive.file",     // Работа с файлами, созданными текущим приложением
    //"https://www.googleapis.com/auth/drive",            // Работа со всеми файлами на диске
    //"https://www.googleapis.com/auth/drive.appdata",
    //"https://www.googleapis.com/auth/drive.metadata",
    //"https://www.googleapis.com/auth/drive.activity",
    //"https://www.googleapis.com/auth/drive.scripts"
];

async function createAuthClientFromFile(keyFile, scopes){
    // Описываем аутентификацию
    const authOptions = {
        keyFile: keyFile,  // Path to a .json, .pem, or .p12 key file
        scopes: scopes,      // Required scopes for the desired API request
        //keyFilename:      // Path to a .json, .pem, or .p12 key file
        //credentials;      // Object containing client_email and private_key properties
        //clientOptions;    // Options object passed to the constructor of the client
        //projectId;        // Your project ID.
    };
    const auth = new googleapis.google.auth.GoogleAuth(authOptions);
    const authClient = await auth.getClient();
    //console.log(authClient);

    // Авторизуемся
    const сredentials = await authClient.authorize();
    authClient.setCredentials(сredentials);

    return authClient;
}

async function createAuthClientFromInfo(email, keyId, key, scopes){
    // Описываем аутентификацию
    const authOptions = {
        email: email,
        //keyFile?: string;
        key: key,
        keyId: keyId,
        scopes: scopes
        //subject?: string;
        //additionalClaims?: {};
    };
    const authClient = new googleapis.google.auth.JWT(authOptions);
    //console.log(authClient);

    // Авторизуемся
    const сredentials = await authClient.authorize();
    authClient.setCredentials(сredentials);

    return authClient;
}

function setAuthGlobal(authClient){
    // Устанавливаем глобально auth клиента для всех запросов, чтобы не надо было каждый раз прокидывать в качестве параметра
    const globalParams = {
        auth: authClient
    };
    googleapis.google.options(globalParams);
}


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
    const authClient = await createAuthClientFromInfo(email, keyId, key, SCOPES);

    // Отгружаем файлики
    const uploadResults = await uploader.uploadWithAuth(authClient, targetFolderId, filesForUploading);
    
    // Выводим результаты
    for(let i = 0; i < uploadResults.length; i++){
        const uploadInfo = uploadResults[i];
        console.log(`Download url for file "${uploadInfo.srcFilePath}": ${uploadInfo.webContentLink}`);
        //console.log(`Web view url for file "${uploadInfo.srcFilePath}": ${uploadInfo.webViewLink}`); 
    }
}

main();
