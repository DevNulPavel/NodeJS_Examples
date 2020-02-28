"use strict";

import fs = require("fs");
import path = require("path");
import googleapis = require("googleapis");
import google_auth_library = require("google-auth-library");


// https://developers.google.com/drive/api/v3/reference
// https://webapps.stackexchange.com/questions/42999/how-can-i-recursively-set-ownership-of-google-drive-files-and-folders
// https://github.com/davidstrauss/google-drive-recursive-ownership/blob/master/transfer.py

interface GDriveUploadResult {
    uploadLinks: Array<Object>,
    targetFolder: string
}

function createDriveObject(authClient) {
    // Создаем объект drive
    const drive = googleapis.google.drive({
        version: "v3",
        auth: authClient
    });

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

async function findFolderWithName(drive, parentId, targetSubFolderName){
    let newFolderId = undefined;
    const listResult = await drive.files.list({
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        includeTeamDriveItems: true,
        supportsTeamDrives: true,
        fields: "nextPageToken, files(id, parents, name, mimeType)" // https://developers.google.com/drive/api/v3/reference/files
    });
    if(listResult.data.files){
        const files = listResult.data.files;
        for(let i = 0; i < files.length; i++){
            const file = files[i];
            const fileType = file.mimeType;
            const fileName = file.name;
            const parents = file.parents;

            const validType = (fileType === "application/vnd.google-apps.folder");
            const validName = (fileName === targetSubFolderName);
            const validParent = (parents !== undefined) ? parents.includes(parentId) : false;
            if(validType && validName && validParent){
                newFolderId = file.id;
                break;
            }
        }
    }
    return newFolderId;
}

async function createFolder(drive, parentFolder, newFolderName) {
    // Пример создания папки
    const createFolderParams = {
        supportsAllDrives: true,
        includeTeamDriveItems: true,
        supportsTeamDrives: true,
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

    return newFolderId;
}

async function uploadFile(drive, parentFolder, filePath, progressCb) {
    // Пример отгрузки файлика
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath); //var apk = require('fs').readFileSync('./Chronicled.apk');
    const createParams = {
        supportsAllDrives: true,
        includeTeamDriveItems: true,
        supportsTeamDrives: true,
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
    if (progressCb) {
        let prevUploadedVal = 0;
        const localProgressCb = (event) => {
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

async function uploadFiles(drive, parentFolderId, filesForUploading, progressCb) {
    // Непосредственно процесс отгрузки
    const MAX_REQ_COUNT = 4;
    const promises = new Set();
    let uploadResults = [];
    for (let i = 0; i < filesForUploading.length; i++) {
        const fileForUploading = filesForUploading[i];

        const uploadInfoProm = uploadFile(drive, parentFolderId, fileForUploading, progressCb);
        promises.add(uploadInfoProm);
        // eslint-disable-next-line promise/catch-or-return
        uploadInfoProm.finally(() => {         // Вызывается после then, позволяет удалить promise
            promises.delete(uploadInfoProm);
        });

        if (promises.size > MAX_REQ_COUNT) {
            const uploadInfo = await Promise.race(promises);
            uploadResults.push(uploadInfo);
        }
    }
    const finalCompletedValues = await Promise.all(promises);
    uploadResults = uploadResults.concat(finalCompletedValues);

    return uploadResults;
}

async function switchOwner(drive, fileId, newOwnerEmail, newDomain) {
    if(!newOwnerEmail && !newDomain){
        return {};
    }
    try{
        // const permList = await drive.permissions.list({
        //     includeTeamDriveItems: true,
        //     supportsTeamDrives: true,
        //     fileId: fileId,
        //     fields: "*", // id, 
        // });
        // console.log(permList.data);

        // const permissions = permList.data["permissions"];
        // let id = null;
        // for (let i = 0; i < permissions.length; i++){
        //     let perm = permissions[i];
        //     if (perm["emailAddress"].toLowerCase() === newOwnerEmail.toLowerCase()) {
        //         id = perm["id"];
        //     }
        // }
        // console.log(id);

        // const permissionResponse = await drive.permissions.update({
        //     fileId: fileId,
        //     permissionId: id,
        //     fields: "id, type, emailAddress, domain, role, displayName, allowFileDiscovery",
        //     transferOwnership: true,
        //     //useDomainAdminAccess: true,
        //     requestBody:{
        //         role: "owner",
        //         //role: "organizer",
        //         //type: "user",
        //         //type: "domain",
        //         //emailAddress: newOwnerEmail,
        //         //domain: "game-insight.com",
        //         //allowFileDiscovery: true
        //     }
        // });
        // console.log(permissionResponse.data);

        // https://developers.google.com/drive/api/v3/reference/permissions/create?apix_params=%7B%22fileId%22%3A%2217cxaTmqlqyctGSQxovt3k3sH2WnIpgnv%22%2C%22transferOwnership%22%3Atrue%2C%22resource%22%3A%7B%22role%22%3A%22owner%22%2C%22type%22%3A%22user%22%2C%22emailAddress%22%3A%22murmansk-build-server%40api-6361261091326496818-652648.iam.gserviceaccount.com%22%7D%7D
        if(newDomain){
            const permissionResponse = await drive.permissions.create({
                fileId: fileId,
                //fields: "id, type, emailAddress, domain, role, displayName, allowFileDiscovery",
                //transferOwnership: true,
                //useDomainAdminAccess: true,
                supportsAllDrives: true,
                supportsTeamDrives: true,
                requestBody:{
                    role: "writer",
                    //role: "organizer",
                    //type: "user",
                    type: "domain",
                    //emailAddress: newOwnerEmail,
                    domain: "game-insight.com",
                    //allowFileDiscovery: true
                }
            });
            //console.log(permissionResponse.data);
    
            return permissionResponse;
        }

        if(newOwnerEmail){
            const permissionResponse = await drive.permissions.create({
                fileId: fileId,
                //fields: "id, type, emailAddress, domain, role, displayName, allowFileDiscovery",
                //transferOwnership: true,
                //useDomainAdminAccess: true,
                supportsAllDrives: true,
                supportsTeamDrives: true,
                requestBody:{
                    role: "owner",
                    //role: "organizer",
                    type: "user",
                    //type: "domain",
                    emailAddress: newOwnerEmail,
                    //domain: "game-insight.com",
                    //allowFileDiscovery: true
                }
            });
            //console.log(permissionResponse.data);
            return permissionResponse;            
        }
    }catch(err){
        console.log(err.message);
    }
    return {};
}

async function switchOwnerForFiles(drive, uploadedFileIds, targetOwnerEmail, targetDomain){
    const MAX_REQUESTS_COUNT = 2;
    const promises = new Set();
    for (let i = 0; i < uploadedFileIds.length; i++) {
        const fileId = uploadedFileIds[i]; 
        const prom = switchOwner(drive, fileId, targetOwnerEmail, targetDomain);
        promises.add(prom);
        // eslint-disable-next-line promise/catch-or-return
        prom.finally(()=>{
            promises.delete(prom);
        });
        if(promises.size > MAX_REQUESTS_COUNT){
            await Promise.race(promises);
        }
    }
    await Promise.all(promises);
}

export async function uploadWithAuth(authClient: google_auth_library.JWT, 
                                     targetOwnerEmail: string, targetDomain: string, targetFolderId: string, targetSubFolderName: string, 
                                     filesForUploading: string[], progressCb: (number)=>void): Promise<GDriveUploadResult> {
    // Создаем рабочий объект диска
    const drive = createDriveObject(authClient);

    // Чистка корзины
    // const result = await drive.files.emptyTrash();
    // console.log(result);
    // console.log(result.data);

    // Получаем список файлов и папок
    /*const {fileIds, folderIds} = await requestFilesList(drive, authClient);
    console.log(`Total files in drive: ${fileIds.length}`);
    console.log(`Total folders in drive: ${folderIds.length}`);

    // Удаляем файлы и папки, параллельно нельзя вызывать, так как есть ограничения на количество запросов у API
    const filesDeleted = await deleteFiles(drive, fileIds);
    console.log(`Files deleted from drive: ${filesDeleted}`);
    const foldersDeleted = await deleteFiles(drive, folderIds);
    console.log(`Folders deleted from drive: ${foldersDeleted}`);*/

    // Ищем уже готовую подпапку для загрузки
    let uploadFolderId = undefined;
    if(targetSubFolderName){
        uploadFolderId = await findFolderWithName(drive, targetFolderId, targetSubFolderName);

        if(!uploadFolderId){
            // Создаем новую подпапку
            //const newFolderName = ().toISOString().replace(/T/, " ").replace(/\..+/, "");
            //const newFolderName = (new Date()).toLocaleString();
            uploadFolderId = await createFolder(drive, targetFolderId, targetSubFolderName);
            
            // Пробуем сменить владельца подпапки
            await switchOwner(drive, uploadFolderId, targetOwnerEmail, targetDomain);
        }
    }else{
        uploadFolderId = targetFolderId;
    }

    // Выполняем отгрузку
    const uploadResults = await uploadFiles(drive, uploadFolderId, filesForUploading, progressCb);

    // Пробуем сменить владельца файлов
    const uploadedFileIds = uploadResults.map((info) => { return info.id; });
    await switchOwnerForFiles(drive, uploadedFileIds, targetOwnerEmail, targetDomain);

    return {
        uploadLinks: uploadResults,
        targetFolder: `https://drive.google.com/drive/u/2/folders/${uploadFolderId}`
    };
}