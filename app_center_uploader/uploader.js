"use strict";

const fs = require("fs");
const path = require("path");
const request = require("request-promise-native");

// https://docs.microsoft.com/en-us/appcenter/distribution/uploading

async function uploadToHockeyApp(token, appName, appOwnerName, filePath, progressCb){
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

    // Получаем URL для отгрузки в центр
    const uploadInfo = await defaultRequest({
        url: `/apps/${appOwnerName}/${appName}/release_uploads`,
        method: "POST",
        json: true,
        body: {
            "release_id": 0,
            "build_version": "1.0.0",
            "build_number": "10"
        }
    });
    const uploadId = uploadInfo.upload_id;
    const uploadUrl = uploadInfo.upload_url;
    //console.log(uploadId);
    //console.log(uploadUrl);

    // Отгружаем данные
    // Чтобы "Content-Type" был "multipart/form-data" в хедерах, просто указываем formData
    const fileStream = fs.createReadStream(filePath);
    if(progressCb){
        const totalSize = fs.statSync(filePath).size;
        let downloadedSize = 0;
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

    return {};
}

module.exports.uploadToHockeyApp = uploadToHockeyApp;
