"use strict";

import fs = require("fs");
import path = require("path");
import { start } from "repl";
import request = require("request-promise-native");

//https://openapi.appcenter.ms/#/distribute/releases_update
//https://docs.microsoft.com/en-us/appcenter/distribution/uploading
//https://docs.microsoft.com/en-us/appcenter/diagnostics/ios-symbolication
//https://github.com/microsoft/appcenter/issues/965

/*async function requestUserInfo(defaultRequest){
    const user = await defaultRequest({
        url: "/user",
        method: "GET",
        json: true
    });
    //console.log(user);
    return user;
}*/

/*async function requestAppsList(defaultRequest){
    const apps = await defaultRequest({
        url: "/apps",
        method: "GET",
        json: true
    });
    //console.log(apps);
    return apps;
}*/


function async_sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function contentTypeForFileName(fileName) {
    // https://github.com/microsoft/fastlane-plugin-appcenter/blob/master/lib/fastlane/plugin/appcenter/actions/appcenter_upload_action.rb
    const extention = path.extname(fileName);
    switch (extention) {
        case ".apk": 
            return "application/vnd.android.package-archive";
        case ".ipa": 
            return "application/octet-stream";
        default:
            return "application/octet-stream";
    }
}

async function uploadBuild(defaultRequest, appOwnerName, appName, distributionGroups, buildFilePath, progressCb) {
    // https://github.com/wooga/atlas-appcenter/pull/27/commits/aa714825d31e409753ee83dff78524c9f8368ed3#diff-e0650eba63e46b95bafdca4afed38c80dddc58a061ee9d8eebb1fb6a72cefcbf
    // https://github.com/microsoft/fastlane-plugin-appcenter/blob/master/lib/fastlane/plugin/appcenter/actions/appcenter_upload_action.rb

    // https://github.com/microsoft/appcenter/issues/2069#issuecomment-740590121
    // https://github.com/microsoft/appcenter/issues/2069#issuecomment-740654621
    // https://openapi.appcenter.ms/#/distribute/releases_createReleaseUpload
    
    // Результат:
    // "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    // "upload_domain": "string",
    // "token": "string",
    // "url_encoded_token": "string",
    // "package_asset_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    let uploadInfo = await defaultRequest({
        url: `/apps/${appOwnerName}/${appName}/uploads/releases`,
        method: "POST",
        json: true,
        headers:{
            "Content-Type": "application/json"
        },
        body: {
            //"release_id": 0,
            //"build_version": "1.0.0",
            //"build_number": "10"
        }
    });

    //console.log("Upload info: ", uploadInfo);

    const uploadId = uploadInfo.id;
    const uploadDomain = uploadInfo.upload_domain;
    const assetId = uploadInfo.package_asset_id;
    const uploadToken = uploadInfo.token;
    const uploadUrlEncodedToken = uploadInfo.url_encoded_token;

    //console.log("Upload url: ", uploadDomain);

    // Отгружаем данные
    // TODO: Content type

    const fileStat = fs.statSync(buildFilePath);
    const fileName = path.basename(buildFilePath);
    const contentType = contentTypeForFileName(fileName);
    const url = `${uploadDomain}/upload/set_metadata/${assetId}?file_name=${fileName}&file_size=${fileStat.size}&token=${uploadUrlEncodedToken}&content_type=${contentType}`;
    // const url = `${uploadDomain}/upload/set_metadata/${assetId}`

    //console.log(url, fileName, fileStat.size, uploadToken);

    let metaInfo = await request({
        url: url,
        method: "POST",
        json: true,
        headers:{
            // "Content-Type": "application/json"
            "Accept": 'application/json'
        },
        // form: {
        //     file_name: fileName,
        //     file_size: fileStat.size,
        //     token: uploadUrlEncodedToken,
        //     content_type: "application/octet-stream"
        // }
    });

    // status_code
    // blob_partitions
    // chunk_list
    // resume_restart
    // chunk_size
    // id
    //console.log("Upload meta info: ", metaInfo);

    const chunkList = metaInfo.chunk_list;
    const chunkSize = metaInfo.chunk_size;
    
    // Параллельная выгрузка, но с ограничением количества одновременных тасков
    const uploadFutures = new Set<Promise<any>>();
    for (let i = 0; i < chunkList.length; i += 1){
        if (uploadFutures.size > 20){
            const result = await Promise.race(uploadFutures);
            //console.log(result);
        }

        const blockNumber = chunkList[i];
        const begin = i * chunkSize;
        const end = ((begin + chunkSize - 1) < fileStat.size-1) ? (begin + chunkSize - 1) : fileStat.size-1;
        const dataLength = end - begin + 1;

        //console.log(begin, end, dataLength);

        const options = {
            start: begin, 
            end: end
        };
        const fileStream = fs.createReadStream(buildFilePath, options);
        if (progressCb) {
            fileStream.on("data", chunk => {
                progressCb(chunk.length);
            });
        }

        // "error":false,
        // "chunk_num":1,
        // "error_code":"None"
        let uploadFuture = request({
            url: `${uploadDomain}/upload/upload_chunk/${assetId}?token=${uploadUrlEncodedToken}&block_number=${blockNumber}`,
            timeout: 1000 * 180,
            // json: true,
            headers:{
                "Content-Length": dataLength
            },
            method: "POST",
            body: fileStream
        });
        // uploadFuture.catch((err)=>{
        //    console.log(err);
        // });
        uploadFuture.then(()=>{
            uploadFutures.delete(uploadFuture);
        });
        
        uploadFutures.add(uploadFuture);
    }
    while(uploadFutures.size > 0){
        const result = await Promise.race(uploadFutures);
        //console.log(result);
    }

    // error_code
    // location
    // raw_location
    // absolute_uri
    // state
    let uploadFinishedRes = await request({
        url: `${uploadDomain}/upload/finished/${assetId}?token=${uploadUrlEncodedToken}`,
        json: true,
        method: "POST"
    });
    //console.log("Upload finished result: ", uploadFinishedRes);

    let changeStatusRes = await defaultRequest({
        url: `/apps/${appOwnerName}/${appName}/uploads/releases/${uploadId}`,
        method: "PATCH",
        json: true,
        body: {
            upload_status: "uploadFinished",
            id: uploadId
        }
    });
    //console.log("Change status result: ", changeStatusRes);

    // Ждем успешного статуса проверки
    let releaseId = null;
    while(true){
        // upload_status
        // id
        const uploadStatusInfo = await defaultRequest({
            url: `/apps/${appOwnerName}/${appName}/uploads/releases/${uploadId}`,
            method: "GET",
            json: true
        }); 
        
        //console.log("Upload status info: ", uploadStatusInfo);

        // uploadStarted, uploadFinished, readyToBePublished, malwareDetected, error
        if (uploadStatusInfo.upload_status == "uploadFinished") {
            await async_sleep(1000 * 5);
            continue;
        }else if (uploadStatusInfo.upload_status == "readyToBePublished") {
            releaseId = uploadStatusInfo.release_distinct_id
            break;
        }else{
            // await async_sleep(1000 * 5);
            // continue;
            // console.log
            throw Error("Invalid upload pooling status: " + uploadStatusInfo);
        }
    }

    // Активируем на конкретные группы если надо
    if (distributionGroups && releaseId){
        const idValue = releaseId;

        let groupsArray = [];
        for(const index in distributionGroups){
            groupsArray.push({
                "name": distributionGroups[index],
            });
        }

        try {
            // TODO: https://github.com/microsoft/appcenter/issues/2069#issuecomment-740654621
            const distributionResult = await defaultRequest({
                url: `/apps/${appOwnerName}/${appName}/releases/${idValue}`,
                method: "PATCH",
                json: true,
                body: {
                    "destinations": groupsArray
                }
            });
            return distributionResult;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    // app_name: 'Paradise-Island-2-TEST',
    // app_display_name: 'Paradise Island 2 TEST',
    // app_os: 'iOS',
    // app_icon_url: 'https://appcenter-filemanagement-distrib5ede6f06e.azureedge.net/1355e644-2690-4362-ab54-54fd90ee9251/AppIcon60x60%402x.png?sv=2019-02-02&sr=c&sig=EUqeAjkDKBKx4KcusfelhK6q%2BuTE4L5arQdJqchgIk8%3D&se=2020-12-16T13%3A44%3A07Z&sp=r',
    // is_external_build: false,
    // origin: 'appcenter',
    // id: 316,
    // version: '365',
    // short_version: '12.8.2',
    // size: 664081646,
    // min_os: '9.0',
    // device_family: 'iPhone/iPod/iPad',
    // bundle_identifier: 'com.gameinsight.island2',
    // fingerprint: '21781ea80cb84c30f613e2c44863d474',
    // uploaded_at: '2020-12-09T13:53:31.994Z',
    // download_url: 'https://appcenter-filemanagement-distrib3ede6f06e.azureedge.net/2afc1205-7f3c-4a5d-8494-e35480a1b415/Island2-iOS-qc-1157-2020.11.06_14.00-tf_12.8.2-efced3e.ipa?sv=2019-02-02&sr=c&sig=rwu6VfM3pgF3mQ8T1poqQsuXACWuRs7al8zikzA0mho%3D&se=2020-12-10T13%3A53%3A38Z&sp=r',
    // install_url: 'itms-services://?action=download-manifest&url=https%3A%2F%2Fappcenter.ms%2Fapi%2Fv0.1%2Fpublic%2Fapps%2F480057ef-d1e4-4b09-94ec-611aa506a024%2Freleases%2F316%2Fios_manifest%3Ftoken%3DP3N2PTIwMTktMDItMDImc3I9YyZzaWc9cnd1NlZmTTNwZ0YzbVE4VDFwb3FRc3VYQUNXdVJzN2FsOHppa3pBMG1obyUzRCZzZT0yMDIwLTEyLTEwVDEzJTNBNTMlM0EzOFomc3A9cg%3D%3D',
    // enabled: true,
    // provisioning_profile_type: 'adhoc',
    // provisioning_profile_expiry_date: '2021-10-27T14:18:57.000Z',
    // provisioning_profile_name: 'Common profile 17b',
    // is_provisioning_profile_syncing: false,
    // package_hashes: 
    //  [ '5e86dbd11db3562b7147ede0dcc8dcbd80732a4e8e76a921c2714583834bf1a0' ],
    // destinations: []
    const releaseInfo = await defaultRequest({
        url: `/apps/${appOwnerName}/${appName}/releases/${releaseId}`,
        method: "GET",
        json: true
    });
    console.log("Release info: ", releaseInfo);

    return releaseInfo;
}

async function uploadSymbols(defaultRequest, appOwnerName, appName, symbolsFilePath, progressCb) {
    // Получаем URL для отгрузки в центр
    const uploadInfo = await defaultRequest({
        url: `/apps/${appOwnerName}/${appName}/symbol_uploads`,
        method: "POST",
        json: true,
        body: {
            //"symbol_type": "Breakpad", // Android
            "symbol_type": "Apple",  // Apple
            //"client_callback": "string",
            //"file_name": "string",
            //"build": "string",
            //"version": "string"
        }
    });
    const symbolsUploadId = uploadInfo.symbol_upload_id;
    const symbolsUploadUrl = uploadInfo.upload_url;

    // Отгружаем данные
    const fileStream = fs.createReadStream(symbolsFilePath);
    if (progressCb) {
        fileStream.on("data", (chunk) => {
            progressCb(chunk.length);
        });
    }
    await request({
        url: symbolsUploadUrl,
        method: "PUT",
        headers: {
            "x-ms-blob-type": "BlockBlob"
        }
    });

    // Коммит отгрузки
    const uploadCommitInfo = await defaultRequest({
        url: `/apps/${appOwnerName}/${appName}/symbol_uploads/${symbolsUploadId}`,
        method: "PATCH",
        json: true,
        body: {
            "status": "committed"
        }
    });

    return uploadCommitInfo;
}

export async function uploadToHockeyApp(token: string, 
                                        appName: string, 
                                        appOwnerName: string, 
                                        distributionGroups: string[], 
                                        buildFilePath: string, 
                                        needSymbolsUploading: boolean, 
                                        symbolsFilePath: string, progressCb: (number)=>void) {
    // Базовый конфиг запроса
    const defaultRequest = request.defaults({
        baseUrl: "https://api.appcenter.ms/v0.1",
        headers: {
            "x-api-token": token
        }
    });

    // Промисы для ожидания результата
    const promises = [];

    // Грузим билд на сервер
    const uploadBuildProm = uploadBuild(defaultRequest, appOwnerName, appName, distributionGroups, buildFilePath, progressCb);
    promises.push(uploadBuildProm);

    // Грузим символы на сервер
    if (needSymbolsUploading) {
        const symbolsUploadProm = uploadSymbols(defaultRequest, appOwnerName, appName, symbolsFilePath, progressCb);
        promises.push(symbolsUploadProm);
    }

    return await Promise.all(promises);
}

export function isSymbolsUploadingSupported(buildFilePath: string, symbolsFilePath: string): boolean {
    // Можем грузить символы или нет?
    const needSymbolsUploading = (path.extname(buildFilePath) === ".ipa") && symbolsFilePath && (path.extname(symbolsFilePath) === ".zip");
    return needSymbolsUploading;
}
