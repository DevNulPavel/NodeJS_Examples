"use strict";

import fs = require("fs");
import path = require("path");
import readline = require("readline");
import lodash = require("lodash");
import commander = require("commander");
import amazon_uploader = require("./uploaders/amazon_uploader");
import app_center_uploader = require("./uploaders/app_center_uploader");
import google_auth = require("./uploaders/google_auth");
import gdrive_uploader = require("./uploaders/gdrive_uploader");
import gplay_uploader = require("./uploaders/gplay_uploader");
import ios_uploader = require("./uploaders/ios_uploader");
import ssh_uploader = require("./uploaders/ssh_uploader");
import slack_uploader = require("./uploaders/slack_uploader");

////////////////////////////////////////////////////////////////////////////////////////////////////

let currentUploadedBytes: number = 0;
let totalBytes: number = 0;
let totalMb: number = 0;

const validateArgumentsLambda = (msg: string, args: IArguments)=>{
    for(let i = 0; i < args.length; i++){
        if(args[i] === undefined){
            throw Error(msg + " (param index: "+ i + ")");
        }
    }
};

/*const debugPrintArgumentsLambda = (args)=>{
    for(let i = 0; i < args.length; i++){
        console.log(`${i}: ${args[i]}`);
    }
};*/

////////////////////////////////////////////////////////////////////////////////////////////////////

interface UploadResult{
    message?: string 
};

////////////////////////////////////////////////////////////////////////////////////////////////////

function async_sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function replaceAllInString(input: string, old: string, newVal: string): string{
    if(!input){
        return input;
    }
    const result = input.split(old).join(newVal);
    return result;
}

// Снижаем частоту вызова данной функции с помощью throttle
const updateProgressBar = lodash.throttle((currentUploadedBytes: number) => {
    const progress: number = (currentUploadedBytes / totalBytes) * 100;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    const curMb: number = Math.round(currentUploadedBytes/1024/1024);
    process.stdout.write(`Upload progress: ${Math.round(progress)}% (${curMb}Mb / ${totalMb}Mb)`);
}, 250);

function updateUploadProgress(bytesUploaded: number){
    currentUploadedBytes += bytesUploaded;
    updateProgressBar(currentUploadedBytes);
}

async function calculateTotalUploadsSize(filesPaths: Array<string>): Promise<number>{
    const sizePromises = filesPaths.map((filePath)=>{
        return new Promise((resolve, reject)=>{
            fs.stat(filePath, (err, stats)=>{
                if(!err){
                    resolve(stats);
                }else{
                    reject(err);
                }
            });
        })
        .catch((err)=>{ 
            console.log(err); 
        });
        /*return fs.promises.stat(filePath).catch((err)=>{ 
            console.log(err); 
        });*/
    });
    const allStats = await Promise
        .all(sizePromises);
    const allSizes = allStats.map((stat: fs.Stats)=>{
        return stat.size;
    });
    const bytesSize: number = allSizes.reduce((prevVal: number, curVal: number)=>{
        return prevVal + curVal;
    }, 0);
    return bytesSize;
}

async function uploadInAmazon(amazonClientId: string, amazonClientSecret: string, amazonAppId: string, amazonInputFile: string): Promise<UploadResult> {
    validateArgumentsLambda("Missing amazon input variables", arguments);

    // Делаем 5 попыток
    let last_err = null;
    for (let index = 0; index < 5; index++) {
        try{
            console.log("Amazon uploading started");
            const progressCb: (number)=>void = process.stdout.isTTY ? updateUploadProgress : undefined; // Нужен ли интерактивный режим?
            await amazon_uploader.uploadBuildOnServer(amazonClientId, amazonClientSecret, amazonAppId, amazonInputFile, progressCb);
            console.log("Amazon uploading finished");
            return {
                message: `Uploaded on Amazon:\n- ${path.basename(amazonInputFile)}`
            };
        }catch(err){
            console.log("Amazon uploading failed, repeat after 15 seconds");
            last_err = err;
            await async_sleep(1000 * 15);
        }
    }
    const slackMessage = `Amazon uploading failed with error:\n${last_err}`;
    return { message: slackMessage };
}

async function uploadInAppCenter(appCenterAccessToken: string, 
                                 appCenterAppName: string, 
                                 appCenterAppOwnerName: string, 
                                 distrubutionGroups: string[], 
                                 inputFile: string, 
                                 symbolsFile: string): Promise<UploadResult>{
    if (!appCenterAccessToken || !appCenterAppName || !appCenterAppOwnerName || !inputFile){
        throw Error("Missing appcenter input variables");
    }

    // Делаем 5 попыток
    let last_err = null;
    for (let index = 0; index < 5; index++) {
        try{
            console.log("App center uploading started");
            const withSymbolsUploading: boolean = app_center_uploader.isSymbolsUploadingSupported(inputFile, symbolsFile);
            const progressCb: (number)=>void = process.stdout.isTTY ? updateUploadProgress : undefined; // Нужен ли интерактивный режим?
            await app_center_uploader.uploadToHockeyApp(
                appCenterAccessToken, 
                appCenterAppName, 
                appCenterAppOwnerName, 
                distrubutionGroups,
                inputFile, 
                withSymbolsUploading, 
                symbolsFile, 
                progressCb); // Нужен ли интерактивный режим?
            
            const message: string = withSymbolsUploading ? 
                `Uploaded on App center:\n- ${path.basename(inputFile)}\n- ${path.basename(symbolsFile)}` : 
                `Uploaded on App center:\n- ${path.basename(inputFile)}`;

            console.log("App center uploading finished");
            return {
                message: message
            };
        }catch(err){
            console.log("App center uploading failed, repeat after 15 seconds");
            last_err = err;
            await async_sleep(1000 * 15);
        }
    }
    const slackMessage = `App center uploading failed with error:\n${last_err}`;
    return { message: slackMessage };
}

async function uploadInGDrive(googleEmail: string, googleKeyId: string, googleKey: string, 
                              inputFiles: string[], 
                              targetFolderId: string, targetSubFolderName: string, targetOwnerEmail: string, targetDomain: string): Promise<UploadResult>{
    if (!googleEmail || !googleKeyId || !googleKey || !inputFiles || !targetFolderId){
        throw Error("Missing google drive enviroment variables");
    }

    // Делаем 5 попыток
    let last_err = null;
    for (let index = 0; index < 5; index++) {
        try{
            console.log("Google drive uploading started");

            // Создание аутентифицации из параметров
            // https://developers.google.com/identity/protocols/googlescopes#driveactivityv2
            const scopes = [
                "https://www.googleapis.com/auth/drive.file",     // Работа с файлами, созданными текущим приложением
                "https://www.googleapis.com/auth/drive",        // Работа со всеми файлами на диске
            ];
            const authClient = await google_auth.createAuthClientFromInfo(googleEmail, googleKeyId, googleKey, scopes);

            const progressCb = process.stdout.isTTY ? updateUploadProgress : undefined; // Нужен ли интерактивный режим?

            const uploadResults = await gdrive_uploader.uploadWithAuth(authClient, targetOwnerEmail, targetDomain, targetFolderId, targetSubFolderName, inputFiles, progressCb);
            
            // Сообщение в слак
            let slackMessage = `Google drive links for folder (${uploadResults.targetFolder}):\n`;
            for(let i = 0; i < uploadResults.uploadLinks.length; i++){
                const uploadInfo: any  = uploadResults.uploadLinks[i];
                slackMessage += `- ${uploadInfo.srcFilePath}: ${uploadInfo.webViewLink}\n`;
                //console.log(`Download url for file "${uploadInfo.srcFilePath}": ${uploadInfo.webContentLink}`);
                //console.log(`Web view url for file "${uploadInfo.srcFilePath}": ${uploadInfo.webViewLink}`); 
            }

            console.log("Google drive uploading finished");
            return { message: slackMessage };
        }catch(err){
            console.log("Google drive uploading failed, repeat after 15 seconds");
            last_err = err;
            await async_sleep(1000 * 15);
        }
    }
    const slackMessage = `Google drive uploading failed with error:\n${last_err}`;
    return { message: slackMessage };
}

async function uploadInGPlay(googleEmail: string, googleKeyId: string, 
                             googleKey: string, inputFile: string, 
                             targetTrack: string, packageName: string): Promise<UploadResult>{
    if (!googleEmail || !googleKeyId || !googleKey || !inputFile || !packageName){
        throw Error("Missing google play enviroment variables");
    }    
    // Делаем 5 попыток
    let last_err = null;
    for (let index = 0; index < 5; index++) {
        try{        // Создание аутентифицации из параметров
            console.log("Google play uploading started");
            const scopes = [ "https://www.googleapis.com/auth/androidpublisher" ];
            const authClient = await google_auth.createAuthClientFromInfo(googleEmail, googleKeyId, googleKey, scopes);
            const progressCb = process.stdout.isTTY ? updateUploadProgress : undefined; // Нужен ли интерактивный режим?
            await gplay_uploader.uploadBuildWithAuth(authClient, packageName, inputFile, targetTrack, progressCb);
            console.log("Google play uploading finished");
            return {
                message: `Uploaded on Google Play:\n- ${path.basename(inputFile)}`
            };
        }catch(err){
            console.log("Google play uploading failed, repeat after 15 seconds");
            last_err = err;
            await async_sleep(1000 * 15);
        }
    }
    const slackMessage = `Google play uploading failed with error:\n${last_err}`;
    return { message: slackMessage };
}

async function uploadInIOSStore(iosUser: string, iosPass: string, ipaToIOSAppStore: string){
    validateArgumentsLambda("Missing iOS enviroment variables", arguments);
    // Делаем 5 попыток
    let last_err = null;
    for (let index = 0; index < 5; index++) {
        try{
            console.log("IOS uploading started");
            await ios_uploader.uploadToIOSAppStore(iosUser, iosPass, ipaToIOSAppStore);
            console.log("IOS uploading finished");
            return {
                message: `Uploaded on iOS store:\n- ${path.basename(ipaToIOSAppStore)}`
            };
        }catch(err){
            console.log("IOS uploading failed, repeat after 15 seconds");
            last_err = err;
            await async_sleep(1000 * 15);
        }
    }
    const slackMessage = `iOS uploading failed with error:\n${last_err}`;
    return { message: slackMessage };
}

async function uploadFilesBySSH(sshServerName: string, sshUser: string, sshPass: string, sshPrivateKeyFilePath: string, 
                                sshUploadFiles: string[], sshTargetDir: string): Promise<UploadResult>{
    validateArgumentsLambda("Missing SSH enviroment variables", arguments);
                                    
    // Делаем 5 попыток
    let last_err = null;
    for (let index = 0; index < 5; index++) {
        try{
            console.log("SSH uploading started");
            const progressCb = process.stdout.isTTY ? updateUploadProgress : undefined; // Нужен ли интерактивный режим?
            await ssh_uploader.uploadBySSH(sshServerName, sshUser, sshPass, sshPrivateKeyFilePath, sshUploadFiles, sshTargetDir, progressCb);
            const filesNames = sshUploadFiles.map((filename)=>{
                return path.basename(filename);
            }).join("\n- ");
            console.log("SSH uploading finished");
            return {
                message: `Uploaded on Samba (${sshTargetDir}):\n- ${filesNames}`
            };
        }catch(err){
            console.log("IOS uploading failed, repeat after 15 seconds");
            last_err = err;
            await async_sleep(1000 * 15);
        }
    }
    const slackMessage = `Samba uploading failed with error:\n${last_err}`;
    return { message: slackMessage };
}

async function uploadFilesToSlack(slackApiToken: string, slackChannel: string, uploadFiles: string[]): Promise<UploadResult>{
    // Делаем 5 попыток
    let last_err = null;
    for (let index = 0; index < 5; index++) {
        try{
            console.log("Slack uploading started");
            const progressCb = process.stdout.isTTY ? updateUploadProgress : undefined; // Нужен ли интерактивный режим?
            await slack_uploader.uploadFilesToSlack(slackApiToken, slackChannel, uploadFiles, progressCb);
            console.log("Slack uploading finished");
            return {};
        }catch(err){
            console.log("Slack uploading failed, repeat after 15 seconds");
            last_err = err;
            await async_sleep(1000 * 15);
        }
    }
    const slackMessage = `Slack uploading failed with error:\n${last_err}`;
    return { message: slackMessage };
}

async function sendTextToSlackUser(slackApiToken: string, slackUser: string, slackUserEmail: string, slackUserText: string, slackUserQRTextCommentary: string, slackUserQrText: string){
    // try{
        await slack_uploader.sendTextToSlackUser(slackApiToken, slackUser, slackUserEmail, slackUserText, slackUserQRTextCommentary, slackUserQrText);
        return {};
    // }catch(err){
    //     const slackMessage = `Slack uploading failed with error:\n${err}`;
    //     return { message: slackMessage };
    // }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

async function main() {
    // Пробуем получить из переменных окружения данные для авторизации
    const amazonClientId = process.env["AMAZON_CLIENT_ID"];
    const amazonClientSecret = process.env["AMAZON_CLIENT_SECRET"];
    const amazonAppId = process.env["AMAZON_APP_ID"];
    const appCenterAccessToken = process.env["APP_CENTER_ACCESS_TOKEN"];
    const appCenterAppName = process.env["APP_CENTER_APP_NAME"];
    const appCenterAppOwnerName = process.env["APP_CENTER_APP_OWNER_NAME"];
    const googlePlayEmail = process.env["GOOGLE_PLAY_SERVICE_EMAIL"];
    const googlePlayKeyId = process.env["GOOGLE_PLAY_KEY_ID"];
    const googlePlayKeyRaw = process.env["GOOGLE_PLAY_KEY"];
    const googleDriveEmail = process.env["GOOGLE_DRIVE_SERVICE_EMAIL"];
    const googleDriveKeyId = process.env["GOOGLE_DRIVE_KEY_ID"];
    const googleDriveKeyRaw = process.env["GOOGLE_DRIVE_KEY"];
    const iosUser = process.env["IOS_USER"]; // TODO: Можно ли передавать так?
    const iosPass = process.env["IOS_PASS"]; // TODO: Можно ли передавать так?
    const sshServerName = process.env["SSH_SERVER"];
    const sshUser = process.env["SSH_USER"];
    const sshPass = process.env["SSH_PASS"];
    const sshPrivateKeyFilePath = process.env["SSH_PRIVATE_KEY_PATH"];
    const slackApiToken = process.env["SLACK_API_TOKEN"];
    const slackChannel = process.env["SLACK_CHANNEL"];

    // Фиксим данные из окружения
    const googlePlayKey = replaceAllInString(googlePlayKeyRaw, "\\n", "\n");
    const googleDriveKey = replaceAllInString(googleDriveKeyRaw, "\\n", "\n");

    //////////////////////////////////////////////////////////////////////////////

    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    const commaSeparatedList = (value) => {
        return value.split(",").filter((val)=>{
            return val && (val.length > 0);
        });
    };
    commander.option("--amazon_input_file <input apk>", "Input file for amazon uploading");
    commander.option("--app_center_input_file <input .apk or .ipa>", "Input file for app center uploading");
    commander.option("--app_center_symbols_file <input .dSYM.zip>", "Input symbols archive for app center uploading");
    commander.option("--app_center_distribution_groups <comma_separeted_groups>", "App center distribution groups: 'group1','group2'", commaSeparatedList);
    commander.option("--google_drive_files <comma_separeted_file_paths>", "Input files for uploading: -gdrivefiles 'file1','file2'", commaSeparatedList);
    commander.option("--google_drive_target_folder_id <folder_id>", "Target Google drive folder ID");
    commander.option("--google_drive_target_subfolder_name <folder_name>", "Target Google drive subfolder name");
    commander.option("--google_drive_target_owner_email <email>", "Target Google drive folder owner email");
    commander.option("--google_drive_target_domain <domain>", "Target Google drive shared domain");
    commander.option("--google_play_upload_file <file_path>", "File path for google play uploading");
    commander.option("--google_play_target_track <target_track>", "Target track for google play build");
    commander.option("--google_play_package_name <package>", "Package name for google play uploading: com.gameinsight.gplay.island2");
    commander.option("--ipa_to_ios_app_store <ipa build path>", "Ipa file for iOS App store uploading");
    commander.option("--ssh_upload_files <comma_separeted_file_paths>", "Input files for uploading: -sshfiles='file1','file2'", commaSeparatedList);
    commander.option("--ssh_target_server_dir <dir>", "Target server directory for files");
    commander.option("--slack_upload_files <comma_separeted_file_paths>", "Input files for uploading: -slackfiles='file1','file2'", commaSeparatedList);
    commander.option("--slack_user <user>", "Slack user name for direct messages");
    commander.option("--slack_user_email <user_email>", "Slack user email for direct messages");
    commander.option("--slack_user_text <text>", "Slack direct message text");
    commander.option("--slack_user_qr_commentary <text>", "Slack direct QR code commentary");
    commander.option("--slack_user_qr_text <text>", "Slack direct QR code content");
    commander.option("--slack_text_prefix <text>", "Prefix for slack channel message");
    commander.parse(process.argv);

    const amazonInputFile: string = commander.amazon_input_file;
    const appCenterFile: string = commander.app_center_input_file;
    const appCenterSymbols: string = commander.app_center_symbols_file;
    const appCenterdistributionGroups: string[] = commander.app_center_distribution_groups;
    const googleDriveFiles: string[] = commander.google_drive_files;
    const googleDriveFolderId : string= commander.google_drive_target_folder_id;
    const googleDriveTargetSubFolderName: string = commander.google_drive_target_subfolder_name;
    const googleDriveTargetOwnerEmail: string = commander.google_drive_target_owner_email;
    const googleDriveTargetDomain: string = commander.google_drive_target_domain;
    const googlePlayUploadFile: string = commander.google_play_upload_file;
    const googlePlayTargetTrack: string = commander.google_play_target_track;
    const googlePlayPackageName: string = commander.google_play_package_name;
    const ipaToIOSAppStore: string = commander.ipa_to_ios_app_store;
    const sshUploadFiles: string[] = commander.ssh_upload_files;
    const sshTargetDir: string = commander.ssh_target_server_dir;
    const slackUploadFiles: string[] = commander.slack_upload_files;
    const slackUser: string = commander.slack_user;
    const slackUserEmail: string = commander.slack_user_email;
    const slackUserText: string = commander.slack_user_text;
    const slackUserQRTextCommentary: string = commander.slack_user_qr_commentary;
    const slackUserQRText: string = commander.slack_user_qr_text;
    const slackTextPrefix: string = commander.slack_text_prefix;

    //////////////////////////////////////////////////////////////////////////////

    // Суммарный объем данных для отгрузки для отображения прогресса
    if (process.stdout.isTTY) {         // Нужен ли интерактивный режим?
        // список файликов
        let filesList = [
            amazonInputFile,
            appCenterFile,
            appCenterSymbols,
            googlePlayUploadFile,
            ipaToIOSAppStore,
        ];
        if(googleDriveFiles){
            filesList = filesList.concat(googleDriveFiles);
        }
        if(sshUploadFiles){
            filesList = filesList.concat(sshUploadFiles);
        }
        if(slackUploadFiles){
            filesList = filesList.concat(slackUploadFiles);
        }
        // Отбрасываем пустые
        filesList = filesList.filter(val => {
            return (val != null) && (val != undefined);
        });
        // Считаем размер
        totalBytes = await calculateTotalUploadsSize(filesList);
        totalMb = Math.round(totalBytes/1024/1024);
    }

    // Промисы с будущими результатами
    const allPromises = new Set<Promise<UploadResult>>();

    // Amazon
    if (amazonInputFile) {
        const uploadProm = uploadInAmazon(amazonClientId, amazonClientSecret, amazonAppId, amazonInputFile);
        allPromises.add(uploadProm);
    }

    // App center
    if(appCenterFile){
        const uploadProm = uploadInAppCenter(appCenterAccessToken, appCenterAppName, appCenterAppOwnerName, appCenterdistributionGroups, appCenterFile, appCenterSymbols);
        allPromises.add(uploadProm);
    }

    // Google drive
    if(googleDriveFiles){
        const uploadProm = uploadInGDrive(
            googleDriveEmail, googleDriveKeyId, googleDriveKey, 
            googleDriveFiles, 
            googleDriveFolderId, googleDriveTargetSubFolderName, 
            googleDriveTargetOwnerEmail, googleDriveTargetDomain);
        allPromises.add(uploadProm);
    }

    // Google play
    if(googlePlayUploadFile){
        const uploadProm = uploadInGPlay(googlePlayEmail, googlePlayKeyId, googlePlayKey, googlePlayUploadFile, googlePlayTargetTrack, googlePlayPackageName);
        allPromises.add(uploadProm);
    }

    // iOS
    if(ipaToIOSAppStore){
        const uploadProm = uploadInIOSStore(iosUser, iosPass, ipaToIOSAppStore);
        allPromises.add(uploadProm);
    }

    // SSH
    if(sshUploadFiles){
        const uploadProm = uploadFilesBySSH(sshServerName, sshUser, sshPass, sshPrivateKeyFilePath, sshUploadFiles, sshTargetDir);
        allPromises.add(uploadProm);
    }

    // Slack
    if(slackUploadFiles){
        const uploadProm = uploadFilesToSlack(slackApiToken, slackChannel, slackUploadFiles);
        allPromises.add(uploadProm);
    }

    // Slack direct
    if(slackUser || slackUserEmail){
        const sendProm = sendTextToSlackUser(slackApiToken, slackUser, slackUserEmail, slackUserText, slackUserQRTextCommentary, slackUserQRText);
        allPromises.add(sendProm);
    }

    // Вывод сообщений в слак
    allPromises.forEach((prom: Promise<UploadResult>)=>{
        // Прописываем удаление из Set при завершении промиса
        // eslint-disable-next-line promise/catch-or-return
        prom.catch((err)=>{
                console.log(err);
            });
        prom.then(()=>{
            allPromises.delete(prom);
        });
        // UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): TypeError: prom.finally is not a function
        /*prom.finally(()=>{
            allPromises.delete(prom);
        });*/
    });
    while(allPromises.size > 0){
        const result: UploadResult = await Promise.race(allPromises);
        if(result.message !== undefined){
            let message = null;
            if (slackTextPrefix){
                message = slackTextPrefix + " " + "```" + result.message + "```";
            }else{
                message = "```" + result.message + "```";
            }
            slack_uploader.sendMessageToSlack(slackApiToken, slackChannel, message);
        }
    }
}

main();