"use strict";

const fs = require("fs");
const util = require("util");
const readline = require("readline");
const commander = require("commander");
const amazon_uploader = require("./src/amazon_uploader");
const app_center_uploader = require("./src/app_center_uploader");
const google_auth = require("./src/google_auth");
const gdrive_uploader = require("./src/gdrive_uploader");
// const gplay_uploader = require("./src/gplay_uploader");
// const ios_uploader = require("./src/ios_uploader");
// const samba_uploader = require("./src/samba_uploader");
// const slack_uploader = require("./src/slack_uploader");

let currentUploadedBytes = 0;
let totalBytes = 0;

function updateUploadProgress(bytesUploaded) {
    currentUploadedBytes += bytesUploaded;
    const progress = (currentUploadedBytes / totalBytes) * 100;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Upload progress: ${Math.round(progress)}%`);
}

async function calculateTotalUploadsSize(filesPaths){
    const sizePromises = filesPaths.map((filePath)=>{
        return fs.promises.stat(filePath).catch(()=>{});
    });
    const allStats = await Promise.all(sizePromises);
    const bytesSize = allStats.reduce((prevVal, stat)=>{
        return prevVal + stat.size;
    });
    return bytesSize;
}

async function uploadInAmazon(amazonClientId, amazonClientSecret, amazonAppId, amazonInputFile) {
    if (!amazonClientId || !amazonClientSecret || !amazonAppId || !amazonInputFile) {
        throw Error("Missing amazon input variables");
    }

    const progressCb = process.stdout.isTTY ? updateUploadProgress : undefined; // Нужен ли интерактивный режим?

    const uploadResults = await amazon_uploader.uploadBuildOnServer(amazonClientId, amazonClientSecret, amazonAppId, amazonInputFile, progressCb);
    // TODO: Result message handle
    return {};
}

async function uploadInAppCenter(appCenterAccessToken, appCenterAppName, appCenterAppOwnerName, inputFile, symbolsFile) {
    if (!appCenterAccessToken || !appCenterAppName || !appCenterAppOwnerName || !inputFile){
        throw Error("Missing appcenter input variables");
    }

    const withSymbolsUploading = app_center_uploader.isSymbolsUploadingSupported(inputFile, symbolsFile);

    const progressCb = process.stdout.isTTY ? updateUploadProgress : undefined; // Нужен ли интерактивный режим?

    const uploadResults = await app_center_uploader.uploadToHockeyApp(
        appCenterAccessToken, 
        appCenterAppName, 
        appCenterAppOwnerName, 
        inputFile, 
        withSymbolsUploading, 
        symbolsFile, 
        progressCb); // Нужен ли интерактивный режим?
    // TODO: Result message handle
    return {};
}

async function uploadInGDrive(googleEmail, googleKeyId, googleKey, inputFiles, targetFolderId){
    if (!googleEmail || !googleKeyId || !googleKey || !inputFiles || !targetFolderId){
        throw Error("Missing google enviroment variables");
    }

    // Создание аутентифицации из параметров
    const scopes = [
        "https://www.googleapis.com/auth/drive.file",     // Работа с файлами, созданными текущим приложением, https://developers.google.com/identity/protocols/googlescopes#driveactivityv2
        //"https://www.googleapis.com/auth/drive",        // Работа со всеми файлами на диске
    ];
    const authClient = await google_auth.createAuthClientFromInfo(googleEmail, googleKeyId, googleKey, scopes);

    const progressCb = process.stdout.isTTY ? updateUploadProgress : undefined; // Нужен ли интерактивный режим?

    const uploadResults = await gdrive_uploader.uploadWithAuth(authClient, targetFolderId, inputFiles, progressCb);
    
    /*for(let i = 0; i < uploadResults.length; i++){
        const uploadInfo = uploadResults[i];
        //console.log(`Download url for file "${uploadInfo.srcFilePath}": ${uploadInfo.webContentLink}`);
        //console.log(`Web view url for file "${uploadInfo.srcFilePath}": ${uploadInfo.webViewLink}`); 
    }*/

    // TODO: Result message handle
    return {};
}

async function main() {
    // Пробуем получить из переменных окружения данные для авторизации
    const amazonClientId = process.env["AMAZON_CLIENT_ID"];
    const amazonClientSecret = process.env["AMAZON_CLIENT_SECRET"];
    const amazonAppId = process.env["AMAZON_APP_ID"];
    const appCenterAccessToken = process.env["APP_CENTER_ACCESS_TOKEN"];
    const appCenterAppName = process.env["APP_CENTER_APP_NAME"];
    const appCenterAppOwnerName = process.env["APP_CENTER_APP_OWNER_NAME"];
    const googleEmail = process.env["GOOGLE_SERVICE_EMAIL"];
    const googleKeyId = process.env["GOOGLE_KEY_ID"];
    const googleKey = process.env["GOOGLE_KEY"];

    //////////////////////////////////////////////////////////////////////////////

    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    const commaSeparatedList = (value) => {
        return value.split(",").filter((val)=>{
            return val.length > 0;
        });
    };
    commander.option("-amz, --amazon_input_file <input apk>", "Input file for amazon uploading");
    commander.option("-appcenter, --app_center_input_file <input .apk or .ipa>", "Input file for app center uploading");
    commander.option("-appcentersymb, --app_center_symbols_file <input .dSYM.zip>", "Input symbols archive for app center uploading");
    commander.option("-gdrivefiles, --google_drive_files <comma_separeted_file_paths>", "Input files for uploading: -gdrivefiles 'file1','file2'", commaSeparatedList);
    commander.option("-gdrivetarget, --google_drive_target_folder_id <folder_id>", "Target Google drive folder ID");
    commander.parse(process.argv);
    const amazonInputFile = commander.amazon_input_file;
    const appCenterFile = commander.app_center_input_file;
    const appCenterSymbols = commander.app_center_input_file;
    const googleDriveFiles = commander.google_drive_files;
    const googleDriveFolderId = commander.google_drive_target_folder_id;

    //////////////////////////////////////////////////////////////////////////////

    // Суммарный объем данных для отгрузки для отображения прогресса
    if (process.stdout.isTTY) {         // Нужен ли интерактивный режим?
        let filesList = [
            amazonInputFile,
            appCenterFile,
            appCenterSymbols,
            ...googleDriveFiles, // Разворачиваем массив в отдельные элементы
        ];
        // Отбрасываем пустые
        filesList = filesList.filter(val => {
            return val !== undefined;
        });
        // Считаем размер
        totalBytes = await calculateTotalUploadsSize(filesList);
    }

    // Промисы с будущими результатами
    const allPromises = [];

    // Amazon
    if (amazonInputFile) {
        const uploadProm = uploadInAmazon(amazonClientId, amazonClientSecret, amazonAppId, amazonInputFile);
        allPromises.push(uploadProm);
    }

    // App center
    if(appCenterFile){
        const uploadProm = uploadInAppCenter(appCenterAccessToken, appCenterAppName, appCenterAppOwnerName, appCenterFile, appCenterSymbols);
        allPromises.push(uploadProm);
    }

    // Google drive
    if(googleDriveFiles){
        const uploadProm = uploadInGDrive(googleEmail, googleKeyId, googleKey, googleDriveFiles, googleDriveFolderId);
        allPromises.push(uploadProm);
    }

    await Promise.all(allPromises);
}

main();