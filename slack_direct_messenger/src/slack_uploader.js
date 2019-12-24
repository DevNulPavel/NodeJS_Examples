"use strict";

const os = require("os");
const path = require("path");
const fs = require("fs");
const request = require("request-promise-native");
const qrcode = require("qrcode");
const uuid = require("uuid");

//////////////////////////////////////////////////////////////////////////////

const CACHE_FILE_NAME = "users_cache.json";

let USERS_CACHE = null;

//////////////////////////////////////////////////////////////////////////////

async function requestSlackUserIds(apiToken) {
    let usersList = [];
    let isComplete = false;
    let lastCursor = null;
    while (!isComplete) {
        isComplete = true;
        const getParams = {
            "token": apiToken,
            "limit": 150,
        };
        if (lastCursor) {
            getParams["cursor"] = lastCursor;
        }
        try {
            const response = await request({
                url: "https://slack.com/api/users.list",
                method: "GET",
                json: true,
                qs: getParams
            });
            if (response.ok) {
                const curCursor = response.response_metadata.next_cursor;
                if (curCursor) {
                    lastCursor = curCursor;
                    isComplete = false;
                }
                const users = response.members.map((userInfo) => {
                    return {
                        "id": userInfo.id,
                        "name": userInfo.name,
                        "realName": userInfo.real_name,
                    };
                });
                usersList = usersList.concat(users);
            }
        }catch (err) {
            isComplete = true;
        }
    }
    return usersList;
}

async function findUserIdByEmail(apiToken, email) {
    if(!email){
        return null;
    }

    try {
        const userInfo = await request({
            url: "https://slack.com/api/users.lookupByEmail",
            method: "GET",
            json: true,
            auth: {
                bearer: apiToken,
            },
            qs: {
                //"token": apiToken,
                "email": email
            }
        });
        return userInfo.user.id;
    } catch (err) {
        return null;
    }
}

async function findUserIdByName(apiToken, user) {
    if (!user) {
        return null;
    }

    user = user.toLowerCase();
    if (!USERS_CACHE) {
        const exists = fs.existsSync(CACHE_FILE_NAME);
        if (exists) {
            try{
                const rawdata = fs.readFileSync(CACHE_FILE_NAME);
                USERS_CACHE = JSON.parse(rawdata.toString());    
            }catch(_){
                USERS_CACHE = {};
            }
        }else {
            USERS_CACHE = {};
        }
    }
    const foundUserInfo = USERS_CACHE[user];
    if (foundUserInfo) {
        return foundUserInfo.id;
    }

    // Запрос списка пользователей
    const searchNameComponents = user.split(" ");
    let foundInfo = null;
    const foundUsers = [];
    const usersList = await requestSlackUserIds(apiToken);
    for (const userInfo of usersList) {
        // Проверяем короткое имя
        if (userInfo["name"] === user) {
            foundInfo = userInfo;
            break;
        }

        // Проверяем полное имя
        let realName = userInfo["realName"];
        if (realName) {
            realName = realName.toLowerCase();
            if (realName === user) {
                foundInfo = userInfo;
                break;
            }
            const testNameComponents = realName.split(" ");
            for (const testPart of testNameComponents) {
                for (const searchPart of searchNameComponents) {
                    if (testPart === searchPart) {
                        if (userInfo.priority) {
                            userInfo.priority += 1;
                        }
                        else {
                            userInfo.priority = 1;
                        }
                        foundUsers.push(userInfo);
                    }
                }
            }
        }
    }

    if (foundInfo) {
        USERS_CACHE[user] = foundInfo;
    }else if (foundUsers.length > 0) {
        const sortedUsers = foundUsers.sort((a, b) => {
            if (a.priority && b.priority) {
                return b.priority - a.priority;
            }
            if (a.priority) {
                return 0 - a.priority;
            }
            if (b.priority) {
                return b.priority - 0;
            }
            return 999999999;
        });
        foundInfo = sortedUsers[0];
        delete foundInfo.priority;
        USERS_CACHE[user] = foundInfo;
    }

    if (foundInfo) {
        const data = JSON.stringify(USERS_CACHE, null, 4);
        fs.writeFileSync(CACHE_FILE_NAME, data);
        return foundInfo.id;
    }

    return null;
}

async function sendTextToSlackUser(apiToken, user, email, text, qrTextCommentary, qrText) {
    // User id receive
    let userId = await findUserIdByEmail(apiToken, email);
    if (!userId) {
        userId = await findUserIdByName(apiToken, user);
        if (!userId) {
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

    if (text) {
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

    if (qrText) {
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
        try {
            const fileStream = fs.createReadStream(tempFilePath);
            await request({
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
        }
        finally {
            // Temp file delete
            fs.unlinkSync(tempFilePath);
        }
    }
    return {};
}

module.exports = { 
    sendTextToSlackUser 
};
