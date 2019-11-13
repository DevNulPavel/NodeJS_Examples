"use strict";

//const request = require("request");
const request = require("request-promise-native");


async function requestToken(clientId, clientSecret) {
    const postRequestData = {
        "url": "https://api.amazon.com/auth/o2/token",
        "json": true,
        "form": {
            "grant_type": "client_credentials",
            "client_id": clientId,
            "client_secret": clientSecret,
            "scope": "appstore::apps:readwrite" // messaging:push, appstore::apps:readwrite
        }
    };
    const response = await request.post(postRequestData);
    const accessToken = response["access_token"];
    return accessToken;
}

async function requestTokenWithInfo(clientId, clientSecret, appId){
    const accessToken = await requestToken(clientId, clientSecret);
    const accessTokenHeader = "Bearer "+accessToken; // {"Authorization": accessTokenHeader}
    console.log(accessTokenHeader);
    console.log("");

    const BASE_URL = "https://developer.amazon.com/api/appstore";
    
    // TODO: StatusCodeError: 412 - {"httpCode":412,"message":"Precondition Failed","errors":[{"errorCode":"error_new_version_creation_not_allowed","errorMessage":"Cannot create a new 'edit' for the app in it's current state."}]}
    try{
        const editUrl = `${BASE_URL}/v1/applications/${appId}/edits`;
        const postRequestData = {
            "url": editUrl,
            "json": true,
            "headers": {
                "Authorization": accessTokenHeader
            }
        };
        const editResponse = await request.post(postRequestData); // POST для создания, GET для получения
        const editId = editResponse["id"];
        console.log(editResponse)
    }catch(err){
        // {
        //     id: 'amzn1.devportal.apprelease.ee65c89e162e4a4e8cea8f60472d2c2e',
        //     status: 'IN_PROGRESS'
        // }
        //console.log(err)
    }
}

module.exports.requestTokenWithInfo = requestTokenWithInfo;
