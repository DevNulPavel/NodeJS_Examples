"use strict";

const fs = require("fs");
const path = require("path");
const request = require("request-promise-native");

// Дока по API
// https://developer.amazon.com/docs/app-submission-api/appsubapi-endpoints.html


async function requestToken(clientId, clientSecret) {
    const response = await request({
        url: "https://api.amazon.com/auth/o2/token",
        method: "POST",
        json: true, // Парсим ответ и отдаем body в json
        form: {
            "grant_type": "client_credentials",
            "client_id": clientId,
            "client_secret": clientSecret,
            "scope": "appstore::apps:readwrite" // messaging:push, appstore::apps:readwrite
        }
    });
    const accessToken = response["access_token"];
    return accessToken;
}

async function requestEditId(defaultRequest){
    const editsDefaultRequest = defaultRequest.defaults({
        url: "/edits",
        json: true,
    });

    // POST для создания, GET для получения уже имеющегося
    // Запускаем одновременно два запроса, смотрим где будет ответ, ошибки отлавливаем здвесь же в промисах
    const editPostProm = editsDefaultRequest.post().catch((err)=>{ /*console.log("POST failed");*/ });
    const editGetProm = editsDefaultRequest.get().catch((err)=>{ /*console.log("GET failed");*/ });

    let editId = undefined;
    const [editPostRes, editGetRes] = await Promise.all([editPostProm, editGetProm]);
    if(editPostRes){
        editId = editPostRes.id;
    }else if (editGetRes){
        editId = editGetRes.id;
    }

    if(!editId){
        throw Error("Missing edit id from server");
    }

    return editId;
}

async function getApksList(defaultEditRequest){
    const apksList = await defaultEditRequest({
        url: "/apks",
        method: "GET",
        json: true,
    });
    //console.log(apksList);
    return apksList;

    // firstAPK = apks[0]
    // apk_id = firstAPK['id']
    // replace_apk_path = '/v1/applications/%s/edits/%s/apks/%s/replace' % (app_id, edit_id, apk_id)

    // ## Open the apk file on your local machine
    // local_apk = open(local_apk_path, 'rb').read()

    // replace_apk_url = BASE_URL + replace_apk_path
    // all_headers = {
    //     'Content-Type': 'application/vnd.android.package-archive',
    //     'If-Match': etag
    // }
    // all_headers.update(headers)
    // replace_apk_response = requests.put(replace_apk_url, headers=all_headers, data=local_apk)
}

async function uploadNewApk(defaultEditRequest, filePath, progressCb){
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

    const fileName = path.basename(filePath);
    const uploadResultData = await defaultEditRequest({
        url: "/apks/upload", // /apks/large/upload
        method: "POST",
        headers: {
            "fileName": fileName,
            //"Content-Type": "application/vnd.android.package-archive" // Вроде бы не надо
            "Content-Type": "application/octet-stream"
        },
        body: fileStream
    });
    const uploadResultJson = JSON.parse(uploadResultData);
    return uploadResultJson;  
}

async function updateListing(){
    // listing_headers = headers.copy()
    // listing_headers.update({
    //     'Content-Type': 'application/json'
    // })
    // listings_etag, current_listing_json = get_current_listing(app_id, edit_id, language, listing_headers)

    // edit_body = current_listing_json.copy()
    // edit_body.update(edit_listing_body)
    // edit_listing_headers = listing_headers.copy()
    // edit_listing_headers.update({
    //     'If-Match': listings_etag
    // })

    // edit_listing_response = update_listing(app_id, edit_id, language, edit_body, edit_listing_headers)
}

async function valiateChanges(defaultEditRequest){
    const resp = await defaultEditRequest({
        url: "/validate",
        method: "POST",
        json: true
    })
    return resp;
}

async function commitChanges(defaultEditRequest, etag){
    const commitResp = await defaultEditRequest({
        url: "/commit",
        method: "POST",
        json: true,
        headers: {
            "If-Match": etag
        }
    })
    return commitResp;
}

async function deleteEditId(defaultEditRequest, etag){
    const finishResp = await defaultEditRequest({
        url: "/",
        method: "DELETE",
        json: true,
        headers: {
            "If-Match": etag
        }
    })
    return finishResp;
}

async function uploadBuildOnServer(clientId, clientSecret, appId, filePath, progressCb){
    // Запрашиваем токен
    const accessToken = await requestToken(clientId, clientSecret);

    // Создаем базовый запрос с токеном и базомвым урлом
    const defaultRequest = request.defaults({
        baseUrl: `https://developer.amazon.com/api/appstore/v1/applications/${appId}`,
        auth: {
            bearer: accessToken // Разворачивается в "headers"{ "Authorization": "Bearer "+accessToken }
        }
    });
    
    // Запрашиваем id редактирования
    const editId = await requestEditId(defaultRequest);
    //console.log(editId);

    // Создаем базовый запрос, но уже со списком 
    const defaultEditRequest = defaultRequest.defaults({
        baseUrl: `https://developer.amazon.com/api/appstore/v1/applications/${appId}/edits/${editId}`
    });

    // Выполняем отгрузку на сервер
    const uploadResults = await uploadNewApk(defaultEditRequest, filePath, progressCb);
    //console.log(uploadResults);

    return uploadResults;

    /*try{        
        // Запрашиваем список имеющихся APK
        //const apksList = await replaceExistingApk(defaultEditRequest);
        //console.log(apksList);

        // Выполняем отгрузку на сервер
        //const uploadResults = await uploadNewApk(defaultEditRequest, filePath, progressCb);
        //console.log(uploadResults);

        // TODO: (Вроде бы не надо)
        // Валидация изменений
        //const validateResp = await valiateChanges(defaultEditRequest);
        //console.log(validateResp);

        // TODO: (Вроде бы не надо)
        // Коммитим изменения
        //const commitResults = await commitChanges(defaultEditRequest, editId);
        //console.log(uploadResults);
    }catch(err){
        throw err;
    }finally{
        // TODO: (Вроде бы не надо)
        // TODO: ??? В самом конце закрываем работу с редактированием
        //const finishResp = await deleteEditId(defaultEditRequest, editId);
        //console.log(finishResp);
    }*/
}

module.exports.uploadBuildOnServer = uploadBuildOnServer;
