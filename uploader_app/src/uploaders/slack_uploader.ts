"use strict";

import fs = require("fs");
import request = require("request-promise-native");


const MAX_UPLOADS_COUNT = 4;

async function uploadFileToSlack(defaultRequest, filePath, progressCb){
    const fileStream = fs.createReadStream(filePath);
    if (progressCb) {
        fileStream.on("data", (chunk) => {
            progressCb(chunk.length);
        });
    }
    const result = await defaultRequest({
        formData: {
            "file": fileStream
        }
    });
    return result;
}

export async function uploadFilesToSlack(apiToken: string, slackChannel: string, filesPaths: string[], progressCb: (number)=>void){
    const defaultReq = request.defaults({
        url: "https://slack.com/api/files.upload",
        method: "POST",
        formData: {
            "token": apiToken,
            "channels": slackChannel
        }
    });

    let uploadResults = [];

    const promises = new Set();
    for(let i = 0; i < filesPaths.length; i++){
        const uploadProm = uploadFileToSlack(defaultReq, filesPaths[i], progressCb);
        promises.add(uploadProm);
        // eslint-disable-next-line promise/catch-or-return
        uploadProm.finally(()=>{
            promises.delete(uploadProm);
        });
        if(promises.size > MAX_UPLOADS_COUNT){
            const anotherResult = await Promise.race(promises);
            uploadResults.push(anotherResult);
        }
    }
    uploadResults = uploadResults.concat(await Promise.all(promises));

    return uploadResults;
}

export async function sendMessageToSlack(apiToken: string, slackChannel: string, message: string){
    const reqProm = request({
        url: "https://slack.com/api/chat.postMessage",
        method: "POST",
        //json: true,
        formData: {
            "token": apiToken,
            "channel": slackChannel,
            "as_user": "false",
            "username": "buildagent",
            "text": message
        }
    });
    return await reqProm;
}

export async function sendTextToSlackUser(apiToken: string, user: string, text: string){
    console.log("test uploading");
    console.log(apiToken, user, text);
    const reqUsersDefault = request.defaults({
        url: "https://slack.com/api/users.list",
        method: "GET",
        //json: true,
        formData: {
            "token": apiToken,
            //"cursor": "",
            //"limit": 0
        }
    });
    let usersInfo = [];
    let isComplete = false;
    let lastCursor = null;
    while(!isComplete) {
        const usersList = await reqUsersDefault({});
        console.log(usersList);
        isComplete = true;
    }
}