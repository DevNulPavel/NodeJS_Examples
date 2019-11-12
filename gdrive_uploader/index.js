"use strict";

const fs = require("fs");
const path = require("path");
const googleapis = require("googleapis");

// http://datalytics.ru/all/rabotaem-s-api-google-drive-s-pomoschyu-python/
// https://developers.google.com/drive/api/v3/reference/files
// https://developers.google.com/identity/protocols/googlescopes#driveactivityv2


const KEY_FILE = __dirname + "/keys_test.json";
const UPLOAD_FILE = __dirname + "/index.js";
const TARGET_FOLDER_ID = "1ziMxgtRz9gzwm7NVEO--WxPXY5rcxpJY";
const SCOPES = [
    "https://www.googleapis.com/auth/drive",            // Работа со всеми файлами на диске
    //"https://www.googleapis.com/auth/drive.appdata",
    //"https://www.googleapis.com/auth/drive.file",     // Работа с файлами, созданными текущим приложением
    //"https://www.googleapis.com/auth/drive.metadata",
    //"https://www.googleapis.com/auth/drive.activity",
    //"https://www.googleapis.com/auth/drive.scripts"
];
// ^^^ https://developers.google.com/identity/protocols/googlescopes#driveactivityv2


async function main(){
    // Описываем аутентификацию
    const authOptions = {
        keyFile: KEY_FILE,  // Path to a .json, .pem, or .p12 key file
        scopes: SCOPES,      // Required scopes for the desired API request
        //keyFilename:      // Path to a .json, .pem, or .p12 key file
        //credentials;      // Object containing client_email and private_key properties
        //clientOptions;    // Options object passed to the constructor of the client
        //projectId;        // Your project ID.
    };
    const auth = new googleapis.google.auth.GoogleAuth(authOptions);
    const authClient = await auth.getClient();

    // Авторизуемся
    const сredentials = await authClient.authorize();
    authClient.setCredentials(сredentials);

    // Устанавливаем глобально auth клиента для всех запросов, чтобы не надо было каждый раз прокидывать в качестве параметра
    /*const globalParams = {
        auth: authClient
    };
    googleapis.google.options(globalParams);*/

    // Создаем объект drive
    const driveConfig = {
        version: "v3",
        auth: authClient
    };
    const drive = googleapis.google.drive(driveConfig);
    //console.log(drive);

    // Запрашиваем список файлов текущих
    const listParams = {
        auth: authClient,
        fields: "nextPageToken, files(id, parents, name, kind, size, mimeType)" // https://developers.google.com/drive/api/v3/reference/files
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
    const listResult = await drive.files.list(listParams);
    //console.log(listResult.data)
    if(listResult.data.files){
        const files = listResult.data.files;
        for(let i = 0; i < files.length; i++){
            const file = files[i];
            const fileType = file.mimeType;
            //console.log(file);
            if(fileType == "application/vnd.google-apps.folder"){

            }else{
                fileIds.push(file.id);
            }
        }
    }
    console.log(`Total files in drive: ${fileIds.length}`);

    // Удаляем все файлы c ограничением максимального количества запросов
    const MAX_REQ_COUNT = 5;
    let totalFilesDeleted = 0;
    const promises = new Set();
    while(fileIds.length > 0){
        const fileId = fileIds.pop(); // Извлекаем из конца
        const deleteParams = {
            auth: authClient,
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
    console.log(`Files deleted from drive: ${totalFilesDeleted}`);

    // Пример отгрузки файлика
    const fileName = path.basename(UPLOAD_FILE);
    const fileSize = fs.statSync(UPLOAD_FILE).size;
    const fileStream = fs.createReadStream(UPLOAD_FILE); //var apk = require('fs').readFileSync('./Chronicled.apk');
    const createParams = {
        auth: authClient,
        requestBody: {
            name: fileName,
            parents: [TARGET_FOLDER_ID]
        },
        media: {
            mimeType: "application/octet-stream",
            body: fileStream
        },
        //ignoreDefaultVisibility?: boolean; //Whether to ignore the domain's default visibility settings for the created file. Domain administrators can choose to make all uploaded files visible to the domain by default; this parameter bypasses that behavior for the request. Permissions are still inherited from parent folders.
        //keepRevisionForever?: boolean; // Whether to set the 'keepForever' field in the new head revision. This is only applicable to files with binary content in Google Drive. Only 200 revisions for the file can be kept forever. If the limit is reached, try deleting pinned revisions.
        //ocrLanguage?: string; // A language hint for OCR processing during image import (ISO 639-1 code).
        //useContentAsIndexableText?: boolean; // Whether to use the uploaded content as indexable text.
        //requestBody?: Schema$File; // Request body metadata
    };
    const createProgressCallback = (event)=>{
        const progress = (event.bytesRead / fileSize) * 100;
        console.log(`Create file progress: ${Math.round(progress)}`);
    };
    const createMethodParams = {
        onUploadProgress: createProgressCallback
    };
    const uploadResult = await drive.files.create(createParams, createMethodParams);
    const uploadedFileId = uploadResult.data.id;
    //console.log(uploadResult.data);

    /*const exportConfig = {
        auth: authClient,
        fileId: uploadedFileId,
        mimeType: 'text/javascript'
    };
    const exportRes = await drive.files.export(exportConfig);
    console.log(exportRes.data);*/

    // Запрос информации
    const getParams = {
        auth: authClient,
        fileId: uploadedFileId,
        fields: "id, parents, name, kind, size, mimeType, webContentLink, webViewLink" // https://developers.google.com/drive/api/v3/
    }
    const getRes = await drive.files.get(getParams);
    //console.log(getRes.data);
    console.log(`Download url: ${getRes.data.webContentLink}`);
    console.log(`Web view url: ${getRes.data.webViewLink}`);

    /*const drivesParams = {
        auth: authClient,
        maxResults: 10,
        //pageToken?: string, // Page token for shared drives.
        //q?: string; //  Query string for searching shared drives.
        //useDomainAdminAccess?: boolean; //Issue the request as a domain administrator; if set to true, then all shared drives of the domain in which the requester is an administrator are returned.
    };
    const drivesRes = await drive.drives.list(drivesParams);
    console.log(drivesRes.data);*/
    
}

main();