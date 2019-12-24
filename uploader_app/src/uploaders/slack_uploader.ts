"use strict";

import os = require("os");
import path = require("path");
import fs = require("fs");
import request = require("request-promise-native");
import qrcode = require("qrcode");
import uuid = require("uuid");

 
const MAX_UPLOADS_COUNT = 4;
const CACHE_FILE_NAME = "users_cache.json";

let USERS_CACHE = null;


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

async function requestSlackUserIds(apiToken: string){
    let usersList: any[] = [];
    let isComplete = false;
    let lastCursor = null;
    while(!isComplete) {
        isComplete = true;
        
        const getParams = {
            "token": apiToken,
            "limit": 150,   
        };
        if(lastCursor){
            getParams["cursor"] = lastCursor;
        }

        try{
            const response = await request({
                url: "https://slack.com/api/users.list",
                method: "GET",
                json: true,
                qs: getParams
            });
            if(response.ok){
                let curCursor = response.response_metadata.next_cursor;
                if(curCursor){
                    lastCursor = curCursor;
                    isComplete = false;
                }
    
                const users = response.members.map((userInfo)=>{
                    return {
                        "id": userInfo.id,
                        "name": userInfo.name,
                        "realName": userInfo.real_name,
                    };
                });
    
                usersList = usersList.concat(users);
            }
        }catch{
        }
    }
    return usersList;
}

async function findUserIdByEmail(apiToken: string, email: string){
    try{
        const userInfo = await request({
            url: "https://slack.com/api/users.lookupByEmail",
            method: "GET",
            json: true,
            auth:{
                bearer: apiToken,
            },
            qs: {
                //"token": apiToken,
                "email": email
            }
        });
        return userInfo.user.id;
    }catch{
    }
    return null;
}

async function findUserIdByName(apiToken: string, user: string){
    if(!user){
        return null;
    }

    user = user.toLowerCase();

    if(!USERS_CACHE){
        const exists = fs.existsSync(CACHE_FILE_NAME);
        if(exists){
            let rawdata = fs.readFileSync("users_cache.json");
            USERS_CACHE = JSON.parse(rawdata.toString());
        }else{
            USERS_CACHE = {};
        }
    }

    let foundUserInfo = USERS_CACHE[user];
    if(foundUserInfo){
        return foundUserInfo.id;
    }
    
    // Запрос списка пользователей
    let foundInfo = null;
    const foundUsers = [];
    const usersList = await requestSlackUserIds(apiToken);
    for(let userInfo of usersList){
        // Проверяем короткое имя
        if(userInfo["name"] === user){
            foundInfo = userInfo
            break;
        }

        // Проверяем полное имя
        let realName = userInfo["realName"];
        if(realName){
            realName = realName.toLowerCase();

            if(realName == user){
                foundInfo = userInfo
                break;
            }

            const testNameComponents = realName.split(" ");
            const searchNameComponents = user.split(" "); // TODO:
            for (let testPart of testNameComponents){
                for (let searchPart of searchNameComponents){
                    if(testPart == searchPart){
                        if(userInfo.priority){
                            userInfo.priority += 1;
                        }else{
                            userInfo.priority = 1;
                        }
                        foundUsers.push(userInfo);
                    }
                }
            }
        }
    }
    
    if(foundInfo){
        USERS_CACHE[user] = foundInfo;
    }else if(foundUsers.length > 0){
        const sortedUsers = foundUsers.sort((a, b)=>{
            if(a.priority && b.priority){
                return b.priority - a.priority;
            }
            if(a.priority){
                return 0 - a.priority;
            }
            if(b.priority){
                return b.priority - 0;
            }
            return 999999999;
        });

        foundInfo = sortedUsers[0];
        delete foundInfo.priority;
        USERS_CACHE[user] = foundInfo;
    }

    if(foundInfo){
        let data = JSON.stringify(USERS_CACHE, null, 4);
        fs.writeFileSync(CACHE_FILE_NAME, data);

        return foundInfo.id;
    }

    return null;
}

export async function sendTextToSlackUser(apiToken: string, user: string, email: string, text: string, qrTextCommentary: string, qrText: string){
    let userId = await findUserIdByEmail(apiToken, email);
    if(!userId){
        userId = await findUserIdByName(apiToken, user);
        if(!userId){
            throw Error(`Id request failed for user: ${user}, email: ${email}`);
        }
    }
    //console.log("User id:", userId);
    
    // Open direct message channel
    const directMessageResp = await request({
        url: "https://slack.com/api/im.open",
        method: "POST",
        json: true,
        auth: {
            bearer: apiToken // Разворачивается в "headers"{ "Authorization": "Bearer "+accessToken }
        },
        formData: {
            //"token": apiToken,
            "user": userId,
        }
    });
    const channelIdVal = directMessageResp.channel.id;
    //console.log("Channel id:", channelIdVal);
    
    if(text){
        //console.log("Send text:", text);
        await request({
            url: "https://slack.com/api/chat.postMessage",
            method: "POST",
            json: true,
            auth: {
                bearer: apiToken // Разворачивается в "headers"{ "Authorization": "Bearer "+accessToken }
            },
            formData: {
                "channel": channelIdVal,
                "text": text,
            }
        });
    }

    if(qrText){
        //console.log("Send qr:", qrText);

        // Temp file
        const tempId = uuid.v4();
        const filename = `${tempId}.png`;
        const tempFilePath = path.join(os.tmpdir(), filename);

        // QRCode
        const qrConfig = {
            errorCorrectionLevel: "H"
        };
        await qrcode.toFile(tempFilePath, qrText, qrConfig);

        // Direct message send
        try{
            const fileStream = fs.createReadStream(tempFilePath);
            const response = await request({
                url: "https://slack.com/api/files.upload",
                method: "POST",
                formData: {
                    "token": apiToken,
                    "channels": channelIdVal,
                    "initial_comment": qrTextCommentary ? qrTextCommentary : qrText,
                    "file": fileStream,
                    "filename": filename
                }
            });
        }finally{
            // Temp file delete
            fs.unlinkSync(tempFilePath);
        }
    }

    return {};
}