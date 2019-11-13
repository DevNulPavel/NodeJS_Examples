"use strict";

const fs = require("fs");
const path = require("path");
const readline = require('readline');
const googleapis = require("googleapis");

// http://datalytics.ru/all/rabotaem-s-api-google-drive-s-pomoschyu-python/
// https://developers.google.com/drive/api/v3/reference/files
// https://developers.google.com/identity/protocols/googlescopes#driveactivityv2


const KEY_FILE = __dirname + "/keys_test.json";
//const UPLOAD_FILE = __dirname + "/index.js";
const UPLOAD_FILE = "/Users/devnul/Desktop/Archive.zip";
const TARGET_FOLDER_ID = "1ziMxgtRz9gzwm7NVEO--WxPXY5rcxpJY";
const SCOPES = [
    //"https://www.googleapis.com/auth/drive",            // Работа со всеми файлами на диске
    //"https://www.googleapis.com/auth/drive.appdata",
    "https://www.googleapis.com/auth/drive.file",     // Работа с файлами, созданными текущим приложением
    //"https://www.googleapis.com/auth/drive.metadata",
    //"https://www.googleapis.com/auth/drive.activity",
    //"https://www.googleapis.com/auth/drive.scripts"
];


async function createAuthClient(keyFile, scopes){
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

function setAuthGlobal(authClient){
    // Устанавливаем глобально auth клиента для всех запросов, чтобы не надо было каждый раз прокидывать в качестве параметра
    const globalParams = {
        auth: authClient
    };
    googleapis.google.options(globalParams);
}

function createDriveObject(authClient){
    // Создаем объект drive
    const driveConfig = {
        version: "v3",
        auth: authClient
    };
    const drive = googleapis.google.drive(driveConfig);
    //console.dir(drive);

    return drive;
}

async function requestFilesList(drive){
    // Запрашиваем список файлов текущих
    const listParams = {
        //auth: authClient,
        fields: "nextPageToken, files(id, parents, name, kind, size, mimeType)" // https://developers.google.com/drive/api/v3/reference/files
        // q="'1uuecd6ndiZlj3d9dSVeZeKyEmEkC7qyr' in parents and name contains 'data'") // TODO: Можно писать гибкие запросы для фильтрации
        //corpora?: string; // Bodies of items (files/documents) to which the query applies. Supported bodies are 'default', 'domain', 'drive' and 'allDrives'. Prefer 'default' or 'drive' to 'allDrives' for efficiency.
        //corpus?: string; // The body of items (files/documents) to which the query applies. Deprecated: use 'corpora' instead.
        //driveId?: string; // ID of the shared drive to search.
        //maxResults?: number; // The maximum number of files to return per page. Partial or empty result pages are possible even before the end of the files list has been reached.
        //orderBy?: string; // A comma-separated list of sort keys. Valid keys are 'createdDate', 'folder', 'lastViewedByMeDate', 'modifiedByMeDate', 'modifiedDate', 'quotaBytesUsed', 'recency', 'sharedWithMeDate', 'starred', 'title', and 'title_natural'. Each key sorts ascending by default, but may be reversed with the 'desc' modifier. Example usage: ?orderBy=folder,modifiedDate desc,title. Please note that there is a current limitation for users with approximately one million files in which the requested sort order is ignored.
        //pageToken?: string; // Page token for files.
        //q?: string; // Query string for searching files.
        //spaces?: string; // A comma-separated list of spaces to query. Supported values are 'drive', 'appDataFolder' and 'photos'.
    };
    const fileIds = [];
    const folderIds = [];
    const listResult = await drive.files.list(listParams);
    //console.log(listResult.data)
    if(listResult.data.files){
        const files = listResult.data.files;
        for(let i = 0; i < files.length; i++){
            const file = files[i];
            const fileType = file.mimeType;
            //console.log(file);
            if(fileType == "application/vnd.google-apps.folder"){
                folderIds.push(file.id);
            }else{
                fileIds.push(file.id);
            }
        }
    }
    return {fileIds, folderIds};
}

async function deleteFiles(drive, fileIds){
    // Удаляем все файлы c ограничением максимального количества запросов
    const MAX_REQ_COUNT = 5;
    let totalFilesDeleted = 0;
    const promises = new Set();
    while(fileIds.length > 0){
        const fileId = fileIds.pop(); // Извлекаем из конца
        const deleteParams = {
            //auth: authClient,
            fileId: fileId
        };
        const deleteProm = drive.files.delete(deleteParams);
        promises.add(deleteProm);
        deleteProm.finally(()=>{         // Вызывается после then, позволяет удалить promise
            promises.delete(deleteProm);
        });

        totalFilesDeleted++;

        if (promises.size > MAX_REQ_COUNT){
            await Promise.race(promises);
        }
    }
    await Promise.all(promises);
    return totalFilesDeleted;
}

async function createFolder(drive, parentFolder, newFolderName){
    // Пример создания папки
    const createFolderParams = {
        //auth: authClient,
        requestBody: {
            name: newFolderName,
            parents: [parentFolder],
            mimeType: "application/vnd.google-apps.folder"
        },
        /*media: {
            mimeType: "application/vnd.google-apps.folder", // application/vnd.google-apps.folder
            //body: "",
        },*/
        fields: "id, parents, name, kind, size, mimeType, webContentLink, webViewLink"
    };
    const folderCreateRes = await drive.files.create(createFolderParams);
    const newFolderId = folderCreateRes.data.id;
    //console.log(folderCreateRes.data)

    return newFolderId;
}

async function uploadFile(drive, parentFolder, filePath, progressCb = ()=>{}){
    // Пример отгрузки файлика
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath); //var apk = require('fs').readFileSync('./Chronicled.apk');
    const createParams = {
        //auth: authClient,
        requestBody: {
            name: fileName,
            parents: [parentFolder]
        },
        media: {
            mimeType: "application/octet-stream", // TODO: Может быть перенести надо в requestBody
            body: fileStream
        },
        fields: "id, parents, name, kind, size, mimeType, webContentLink, webViewLink"
        //ignoreDefaultVisibility?: boolean; //Whether to ignore the domain's default visibility settings for the created file. Domain administrators can choose to make all uploaded files visible to the domain by default; this parameter bypasses that behavior for the request. Permissions are still inherited from parent folders.
        //keepRevisionForever?: boolean; // Whether to set the 'keepForever' field in the new head revision. This is only applicable to files with binary content in Google Drive. Only 200 revisions for the file can be kept forever. If the limit is reached, try deleting pinned revisions.
        //ocrLanguage?: string; // A language hint for OCR processing during image import (ISO 639-1 code).
        //useContentAsIndexableText?: boolean; // Whether to use the uploaded content as indexable text.
        //requestBody?: Schema$File; // Request body metadata
    };
    const createMethodParams = {
        onUploadProgress: progressCb
    };
    const uploadResult = await drive.files.create(createParams, createMethodParams);
    //console.log(uploadResult.data);
    return uploadResult.data;
}

async function otherExamples(){
    /*const exportConfig = {
        auth: authClient,
        fileId: uploadedFileId,
        mimeType: 'text/javascript'
    };
    const exportRes = await drive.files.export(exportConfig);
    console.log(exportRes.data);*/

    // Запрос информации
    /*const getParams = {
        auth: authClient,
        fileId: uploadedFileId,
        fields: "id, parents, name, kind, size, mimeType, webContentLink, webViewLink" // https://developers.google.com/drive/api/v3/
    }
    const getRes = await drive.files.get(getParams);
    //console.log(getRes.data);
    console.log(`Download url: ${getRes.data.webContentLink}`);
    console.log(`Web view url: ${getRes.data.webViewLink}`);*/   
}

async function main(){
    const authClient = await createAuthClient(KEY_FILE, SCOPES);

    const drive = createDriveObject(authClient);

    const {fileIds, folderIds} = await requestFilesList(drive, authClient);
    console.log(`Total files in drive: ${fileIds.length}`);
    console.log(`Total folders in drive: ${folderIds.length}`);

    const filesDeleted = await deleteFiles(drive, fileIds);
    console.log(`Files deleted from drive: ${filesDeleted}`);
    const foldersDeleted = await deleteFiles(drive, folderIds);
    console.log(`Folders deleted from drive: ${foldersDeleted}`);

    const newFolderId = await createFolder(drive, TARGET_FOLDER_ID, "NewFolder_"+Date.now())

    process.stdout.write("Start uploading...")
    let createProgressCallback;
    var isInteractiveTerminal = process.stdout.isTTY && process.stdin.isTTY && !!process.stdin.setRawMode
    if(isInteractiveTerminal){
        const fileSize = fs.statSync(UPLOAD_FILE).size;
        createProgressCallback = (event)=>{
            const progress = (event.bytesRead / fileSize) * 100;
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Upload file progress: ${Math.round(progress)}%`);
        };
    }else{
        createProgressCallback = ()=>{};
    }
    const uploadInfo = await uploadFile(drive, newFolderId, UPLOAD_FILE, createProgressCallback)

    console.log("");
    console.log(`Download url: ${uploadInfo.webContentLink}`);
    console.log(`Web view url: ${uploadInfo.webViewLink}`); 
}

main();