"use strict";

const fs = require("fs");
const path = require("path");
const googleapis = require("googleapis");

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

/*async function requestFilesList(drive){
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
            if(fileType === "application/vnd.google-apps.folder"){
                folderIds.push(file.id);
            }else{
                fileIds.push(file.id);
            }
        }
    }
    return {fileIds, folderIds};
}*/

/*async function deleteFiles(drive, fileIds){
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
        deleteProm.catch(()=>{
        });
        // eslint-disable-next-line promise/catch-or-return
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
}*/

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

async function uploadFile(drive, parentFolder, filePath, progressCb){
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
            //mimeType: "application/octet-stream", // TODO: Может быть перенести надо в requestBody
            body: fileStream
        },
        fields: "id, parents, name, kind, size, mimeType, webContentLink, webViewLink"
        //ignoreDefaultVisibility?: boolean; //Whether to ignore the domain's default visibility settings for the created file. Domain administrators can choose to make all uploaded files visible to the domain by default; this parameter bypasses that behavior for the request. Permissions are still inherited from parent folders.
        //keepRevisionForever?: boolean; // Whether to set the 'keepForever' field in the new head revision. This is only applicable to files with binary content in Google Drive. Only 200 revisions for the file can be kept forever. If the limit is reached, try deleting pinned revisions.
        //ocrLanguage?: string; // A language hint for OCR processing during image import (ISO 639-1 code).
        //useContentAsIndexableText?: boolean; // Whether to use the uploaded content as indexable text.
        //requestBody?: Schema$File; // Request body metadata
    };
    const createMethodParams = {};
    if(progressCb){
        let prevUploadedVal = 0;
        const localProgressCb = (event)=>{
            const diff = event.bytesRead - prevUploadedVal;
            prevUploadedVal = event.bytesRead;
            progressCb(diff);
        };
        createMethodParams["onUploadProgress"] = localProgressCb;
    }
    const uploadResult = await drive.files.create(createParams, createMethodParams);
    uploadResult.data.srcFilePath = fileName;
    
    return uploadResult.data;
}

async function uploadFiles(drive, parentFolderId, filesForUploading, progressCb){
    // Непосредственно процесс отгрузки
    const MAX_REQ_COUNT = 5;
    const promises = new Set();
    let uploadResults = [];
    for(let i = 0; i < filesForUploading.length; i++){
        const fileForUploading = filesForUploading[i];

        const uploadInfoProm = uploadFile(drive, parentFolderId, fileForUploading, progressCb);
        promises.add(uploadInfoProm);
        // eslint-disable-next-line promise/catch-or-return
        uploadInfoProm.finally(()=>{         // Вызывается после then, позволяет удалить promise
            promises.delete(uploadInfoProm);
        });

        if (promises.size > MAX_REQ_COUNT){
            const uploadInfo = await Promise.race(promises);
            uploadResults.push(uploadInfo);
        }       
    }
    const finalCompletedValues = await Promise.all(promises);
    uploadResults = uploadResults.concat(finalCompletedValues);
    
    return uploadResults;
}

async function uploadWithAuth(authClient, targetFolderId, filesForUploading, progressCb){
    // Создаем рабочий объект диска
    const drive = createDriveObject(authClient);

    /*// Получаем список файлов и папок
    const {fileIds, folderIds} = await requestFilesList(drive, authClient);
    console.log(`Total files in drive: ${fileIds.length}`);
    console.log(`Total folders in drive: ${folderIds.length}`);

    // Удаляем файлы и папки, параллельно нельзя вызывать, так как есть ограничения на количество запросов у API
    const filesDeleted = await deleteFiles(drive, fileIds);
    console.log(`Files deleted from drive: ${filesDeleted}`);
    const foldersDeleted = await deleteFiles(drive, folderIds);
    console.log(`Folders deleted from drive: ${foldersDeleted}`);*/

    // Создаем новую подпапку
    //const newFolderName = ().toISOString().replace(/T/, " ").replace(/\..+/, "");
    const newFolderName = (new Date()).toLocaleString();
    const newFolderId = await createFolder(drive, targetFolderId, newFolderName);

    // Выполняем отгрузку
    const uploadResults = await uploadFiles(drive, newFolderId, filesForUploading, progressCb);

    return uploadResults;
}

module.exports.uploadWithAuth = uploadWithAuth;