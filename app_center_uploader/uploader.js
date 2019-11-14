"use strict";

const fs = require("fs");
const path = require("path");
const request = require("request-promise-native");

// https://docs.microsoft.com/en-us/appcenter/distribution/uploading
//https://docs.microsoft.com/en-us/appcenter/diagnostics/ios-symbolication

async function uploadToHockeyApp(token, appName, appOwnerName, buildFilePath, symbolsFilePath, progressCb){
    const defaultRequest = request.defaults({
        baseUrl: "https://api.appcenter.ms/v0.1",
        headers: {
            "X-API-Token": token
        }
    });

    /*const user = await defaultRequest({
        url: "/user",
        method: "GET",
        json: true
    });
    console.log(user);*/

    /*const apps = await defaultRequest({
        url: "/apps",
        method: "GET",
        json: true
    });
    console.log(apps);*/

    // Получаем URL для отгрузки приложения в центр
    const uploadInfo = await defaultRequest({
        url: `/apps/${appOwnerName}/${appName}/release_uploads`,
        method: "POST",
        json: true,
        body: {
            //"release_id": 0,
            //"build_version": "1.0.0",
            //"build_number": "10"
        }
    });
    const uploadId = uploadInfo.upload_id;
    const uploadUrl = uploadInfo.upload_url;
    //console.log(uploadId);
    //console.log(uploadUrl);

    const needSymbolsUploading = (path.extname(buildFilePath) == "ipa") && symbolsFilePath && (path.extname(symbolsFilePath) == "dSYM");
    let downloadedSize = 0;
    let totalSize = fs.statSync(buildFilePath).size;
    if(needSymbolsUploading){
        totalSize += fs.statSync(symbolsFilePath).size;
    }


    // Отгружаем данные
    // Чтобы "Content-Type" был "multipart/form-data" в хедерах, просто указываем formData
    const fileStream = fs.createReadStream(buildFilePath);
    if(progressCb){
        fileStream.on("data", (chunk)=>{
            downloadedSize += chunk.length;
            const progress = (downloadedSize / totalSize) * 100;
            progressCb(progress);
        });    
    }
    await request({
        url: uploadUrl,
        method: "POST",
        formData: {
            "ipa": fileStream
        }
    });

    // Коммит отгрузки
    const uploadCommitInfo = await defaultRequest({
        url: `/apps/${appOwnerName}/${appName}/release_uploads/${uploadId}`,
        method: "PATCH",
        json: true,
        body: {
            "status": "committed"
        }
    });
    console.log(uploadCommitInfo);
    // {
    //     release_id: '17',
    //     release_url: 'v0.1/apps/Game-Insight-HQ-Organization/QC-Paradise-Island-2-Android/releases/17'
    // }

    if(needSymbolsUploading){
        // Получаем URL для отгрузки в центр
        const uploadInfo = await defaultRequest({
            url: `/apps/${appOwnerName}/${appName}/symbol_uploads`,
            method: "POST",
            json: true,
            body: {
                "symbol_type": "Apple",
                //"client_callback": "string",
                //"file_name": "string",
                //"build": "string",
                //"version": "string"
            }
        });
        const symbolsUploadId = uploadInfo.symbol_upload_id;
        const symbolsUploadUrl = uploadInfo.upload_url;
        console.log(symbolsUploadId);
        console.log(symbolsUploadUrl);

        // Отгружаем данные
        // Чтобы "Content-Type" был "multipart/form-data" в хедерах, просто указываем formData
        const fileStream = fs.createReadStream(symbolsFilePath);
        if(progressCb){
            fileStream.on("data", (chunk)=>{
                downloadedSize += chunk.length;
                const progress = (downloadedSize / totalSize) * 100;
                progressCb(progress);
            });    
        }
        await request({
            url: symbolsUploadUrl,
            method: "PUT",
            headers:{
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
        console.log(uploadCommitInfo);
    }

    return {};
}

module.exports.uploadToHockeyApp = uploadToHockeyApp;
