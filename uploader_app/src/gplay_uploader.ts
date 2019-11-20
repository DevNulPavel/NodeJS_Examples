"use strict";

import fs = require("fs");
import path = require("path");
import googleapis = require("googleapis");

//https://developers.google.com/android-publisher
//http://frontendcollisionblog.com/javascript/2015/12/26/using-nodejs-to-upload-app-to-google-play.html
//https://googleapis.dev/nodejs/googleapis/latest/androidpublisher/classes/Resource$Edits$Apks-1.html#upload
//https://stackoverflow.com/questions/48274009/cant-upload-apk-to-google-play-developer-via-publisher-api


function createPublisher(authClient, packageName){
    // Создаем паблишер
    const publisher = googleapis.google.androidpublisher({
        version: "v3",
        auth: authClient,
        params: {
            packageName: packageName
        }
    });

    return publisher;
}

async function startInsert(publisher, packageName){
    // Запрашиваем editId для возможности редактирования
    const insertParams = {
        packageName: packageName
        //requestBody?: Schema$AppEdit;
    };
    const editObj = await publisher.edits.insert(insertParams);
    const editId = editObj.data.id;
    return editId;
}

async function uploadBuild(publisher, editId, uploadFile, packageName, progressCb){
    // Выбираем тип отгрузки
    let uploadModule;
    //let mimeType;
    const fileExt = path.extname(uploadFile);
    if (fileExt === ".aab"){
        uploadModule = publisher.edits.bundles;
        //mimeType = "application/octet-stream";
    }else if(fileExt === ".apk"){
        uploadModule = publisher.edits.apks;
        //mimeType = "application/vnd.android.package-archive";
    }else{
        throw new Error("Invalid file extention");
    }

    // Отгрузка в стор
    const fileStream = fs.createReadStream(uploadFile);
    if(progressCb){
        fileStream.on("data", (chunk) => {
            progressCb(chunk.length);
        });
    }
    const uploadParams = {
        editId: editId,
        packageName: packageName,
        media: {
            //mimeType: mimeType, // TODO: Нужно ли?
            body: fileStream,
        }
    };
    const uploadResult = await uploadModule.upload(uploadParams);
    const uploadedVersion = uploadResult.data.versionCode;

    return uploadedVersion;
}

/*async function updateBuildTrack(publisher, editId, uploadedVersion, targetTrack, packageName){
    const updateTrackConfig = {
        packageName: packageName,
        editId: editId,
        track: targetTrack,
        requestBody: {
            track: targetTrack,
            releases: [
                {
                    versionCodes: uploadedVersion
                }
            ]
        }
    };
    const updateTrackRes = await publisher.edits.tracks.update(updateTrackConfig);

    return updateTrackRes.data;
}*/

async function validateParams(publisher, editId, packageName){
    const validateParams = {
        editId: editId,
        packageName: packageName,
    };
    const validateResult = await publisher.edits.validate(validateParams);
    return validateResult.data;
}

async function commitChanges(publisher, editId, packageName) {
    const commitParams = {
        editId: editId,
        packageName: packageName,
    };
    const commitRes = await publisher.edits.commit(commitParams);
    return commitRes.data;
}

export async function uploadBuildWithAuth(authClient, packageName, uploadFile, targetTrack, progressCb){
    const publisher = createPublisher(authClient, packageName);

    // Запрашиваем editId для возможности редактирования
    const editId = await startInsert(publisher, packageName);
    //console.log(`Edit id: ${editId}`);

    // Старт загрузки
    await uploadBuild(publisher, editId, uploadFile, packageName, progressCb); // Возвращает uploadedVersion 
    //console.log(`Uploaded version: ${uploadedVersion}`);

    // Обновляем track
    if(targetTrack){
        // Сейчас отключено обновление трека
        /*try{
            await updateBuildTrack(publisher, editId, uploadedVersion, targetTrack, packageName);
            console.log("Update track res:", updateTrackRes);    
        }catch(err){
            console.log(err);
        }*/
    }

    // Делаем валиацию
    await validateParams(publisher, editId, packageName); // Возвращает validateResult 
    //console.log("Validate res:", validateResult);

    // Коммитим изменения
    const commitRes = await commitChanges(publisher, editId, packageName);
    //console.log("Commit res:", commitRes);

    return commitRes;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/*async function mainTests(){
    // Описываем аутентификацию
    const authOptions = {
        keyFile: KEY_FILE,  // Path to a .json, .pem, or .p12 key file
        scopes: SCOPE,      // Required scopes for the desired API request
        //keyFilename: // Path to a .json, .pem, or .p12 key file
        //credentials; // Object containing client_email and private_key properties
        //clientOptions; // Options object passed to the constructor of the client
        //projectId; // Your project ID.
    };
    const auth = new googleapis.google.auth.GoogleAuth(authOptions);
    const authClient = await auth.getClient();

    // Авторизуемся
    const сredentials = await authClient.authorize();
    authClient.setCredentials(сredentials);

    // Устанавливаем глобально auth клиента для всех запросов, чтобы не надо было каждый раз прокидывать в качестве параметра
    const globalParams = {
        auth: authClient
    };
    googleapis.google.options(globalParams);

    // Создаем паблишер
    const publisherParams = {
        version: "v3",
        auth: authClient,
        params: {
            packageName: PACKAGE_NAME
        }
    }
    const publisher = googleapis.google.androidpublisher(publisherParams);

    // Пример получения отзывов
    {
        // https://googleapis.dev/nodejs/googleapis/latest/androidpublisher/interfaces/Params$Resource$Reviews$List.html
        const listParameters = {
            auth: client,
            maxResults: 200,
            packageName: PACKAGE_NAME,
            startIndex: 0,
            token: token,
            translationLanguage: "ru"
        };
        const list = await publisher.reviews.list(listParameters);
        for (let i = 0; i < list.data.reviews.length; i++){
            const review = list.data.reviews[i];
            if(!review.authorName){
                continue;
            }
            console.log(`Comments form author: ${review.authorName.toString()}`);
            for (let j = 0; j < review.comments.length; j++) {
                const comment = review.comments[j];
                if (!comment.userComment || !comment.userComment.text){
                    continue;
                }
                console.log(`-> ${comment.userComment.text.toString()}`);
            }
        }
    }
    
    //{
        // Запрашиваем editId для возможности редактирования
        const insertParams = {
            auth: authClient,
            packageName: PACKAGE_NAME
            //requestBody?: Schema$AppEdit;
        };
        const editObj = await publisher.edits.insert(insertParams);
        const editId = editObj.data.id;

        // Запрашиваем getId
        const getParams = {
            auth: authClient,
            editId: editId,
            packageName: PACKAGE_NAME
        };
        const getObj = await publisher.edits.get(getParams);
        const getId = getObj.data.id;

        // Запрашиваем список бандлов и apk
        const listParameters = {
            editId: editId,
            auth: authClient,
            packageName: PACKAGE_NAME
        };
        const bundlesProm = publisher.edits.bundles.list(listParameters);
        const apksProm = publisher.edits.apks.list(listParameters);

        // Выводим список бандлов
        const bundlesList = await bundlesProm;
        if(bundlesList.data.bundles){
            for (let i = 0; i < bundlesList.data.bundles.length; i++){
                const bundle = bundlesList.data.bundles[i]
                console.log(bundle);
            }
        }else{
            console.log("No bundles");
        }

        // Выводим список apk
        const apksList = await apksProm;
        if(apksList.data.apks){
            for (let i = 0; i < apksList.data.apks.length; i++){
                const apk = apksList.data.apks[i]
                console.log(apk);
            }
        }else{
            console.log("No apks");
        }

        // Запрашиваем tracks
        const listParams = {
            editId: editId,
            auth: authClient,
            packageName: PACKAGE_NAME
        };
        const tracksInfo = await publisher.edits.tracks.list(listParams);
        if (tracksInfo.data.tracks){
            const tracks = tracksInfo.data.tracks;
            for(let i = 0; i < tracks.length; i++){
                const track = tracks[i];
                console.log(track);
            }
        }

        // Запрос apklistings
        if(publisher.edits.apklistings){
            const apkListingsParams = {
                auth: authClient,
                packageName: PACKAGE_NAME,
                editId: editId
                //apkVersionCode?: number;
            };
            const listings = await publisher.edits.apklistings.list(apkListingsParams);
            console.log(listings);
        }

        // Получаем информацию о приложении
        const detailsGetParams = {
            editId: editId,
            auth: authClient,
            packageName: PACKAGE_NAME
        };
        const detailsResult = await publisher.edits.details.get(detailsGetParams);
        console.log(detailsResult.data);

        const expansionfilesParams = {
            editId: editId,
            auth: authClient,
            packageName: PACKAGE_NAME,
            apkVersionCode: "11.14.1",
            expansionFileType: ""
        };
        const expansionfilesRes = await publisher.edits.expansionfiles.get(expansionfilesParams);
        console.log(expansionfilesRes.data);

        // Запрос картинок
        const imagesParams = {
            editId: editId,
            auth: authClient,
            packageName: PACKAGE_NAME,
            imageType: "phonescreenshots", // [featuregraphic, icon, phonescreenshots, promographic, seveninchscreenshots, teninchscreenshots, tvbanner, tvscreenshots, wearscreenshots]
            language: "en-US"
        };
        const imagesRes = await publisher.edits.images.list(imagesParams);
        console.log(imagesRes.data);

        // Запрос описания приложения на разных языках
        const listingsParams = {
            editId: editId,
            auth: authClient,
            packageName: PACKAGE_NAME,
        };
        const listingRes = await publisher.edits.listings.list(listingsParams);
        console.log(listingRes.data);

        // TODO: Запрос валидации???
        const validateParams = {
            editId: editId,
            auth: authClient,
            packageName: PACKAGE_NAME,
        }
        const validateResult = await publisher.edits.validate(validateParams);
        const validateId = validateResult.data.id;
        console.log(validateResult.data);

        // Отгрузка apk в стор
        const apkStream = fs.createReadStream("file.apk"); //var apk = require('fs').readFileSync('./Chronicled.apk');
        const uploadParams = {
            auth: authClient,
            editId: editId,
            packageName: PACKAGE_NAME,
            media: {
                mimeType: "application/vnd.android.package-archive", // TODO: ??? "application/octet-stream", "application/vnd.android.package-archive",
                body: apkStream,
            }
        };
        const uploadResult = await publisher.edits.apks.upload(uploadParams);
        const uploadedVersion = uploadResult.data.versionCode;

        // Устанавливаем track после отгрузки
        const updateTrackConfig = {
            packageName: PACKAGE_NAME,
            auth: authClient,
            editId: editId,
            track: TARGET_TRACK_NAME,
            requestBody: {
                track: track,
                versionCodes: [uploadedVersion]
                //userFraction:
            }
        };
        const updateTrackRes = await publisher.edits.tracks.update(updateTrackConfig);
    //}
//}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*function startEdit(jwtClient, oauth2Client, play) {
    return new Promise(function(resolve, reject) {
        // Авторизуемся
        jwtClient.authorize(function(err, tokens) {
            if(err) {
                console.log(err);
                return;
            }
            
            // Устанавливаем токен для работы
            oauth2Client.setCredentials(tokens);
            
            const params = {
                resource: {
                    id: EDIT_ID,
                    expiryTimeSeconds: 600 // this edit will be valid for 10 minutes
                }
            };
            play.edits.insert(params, function(err, edit) {
                if(err || !edit) {
                    reject(err);
                }
                
                const resolveData = {
                    edit: edit
                };
                resolve(resolveData);
            });
        });
    });
}

function upload(play, data) {
    const edit = data.edit;
    const apk = data.apk;
    
    return new Promise(function(resolve, reject) {
        const uploadConfig = {
            editId: edit.id,
            media: {
                mimeType: 'application/vnd.android.package-archive',
                body: apk
            }
        };
        play.edits.apks.upload(uploadConfig, function(err, res) {
            if(err || !res) {
                reject(err);
            }
            
            // TODO: !!!
            // pass any data we care about to the next function call
            resolve(_.omit(_.extend(data, { uploadResults: res }), 'apk'));
        });
    });
}

function setTrack(play, data) {
    const edit = data.edit;
    const track = TRACK; // TODO: ???
    
    return new Promise(function(resolve, reject) {
        const updateConfig = {
            editId: edit.id,
            track: track,
            resource: {
                track: track,
                versionCodes: [+data.uploadResults.versionCode]
            }
        };
        play.edits.tracks.update(updateConfig, function(err, res) {
            if(err || !res) {
                reject(err);
            }
            
            resolve(_.extend(data, { setTrackResults: res }));
        });
    });
    
}

function commitToPlayStore(play, data) {
    return new Promise(function(resolve, reject) {
        const commitConfig = {
            editId: data.edit.id
        };
        play.edits.commit(commitConfig, function(err, res) {
            if(err || !res) {
                reject(err);
            }
            
            resolve(_.extend(data, { commitToPlayStoreResults: res }));
        });
    });
}

async function main(){
    //const publisher = new googleapis.androidpublisher_v3.Androidpublisher(publisherParams);

    // here, we'll initialize our client
    const key = require("./keys.json");
    const oauth2Client = new google.oauth2_v2.Oauth2("v2");
    const jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, scopes, null);
    const play = google.androidpublisher({
        version: 'v3',
        auth: oauth2Client,
        params: {
            // default options
            // this is the package name for your initial app you've already set up on the Play Store
            packageName: 'com.gameinsight.gplay.enginetest'
        }
    });

    google.options({ 
        auth: oauth2Client 
    });

    // "open" our edit
    startEdit(jwtClient, play).then(function(data) {
        //var apk = require('fs').readFileSync('./Chronicled.apk');
        const apk = fs.createReadStream("file.apk");
        
        // stage the upload (doesn't actually upload anything)
        return upload({
            edit: data.edit,
            apk: apk
        });
    }).then(function(data) {
        // set our track
        return setTrack(play, data);
    }).then(function(data) {
        // commit our changes
        return commitToPlayStore(play, data);
    }).then(function(data) {
        // log our success!
        console.log('Successful upload:', data);
    }).catch(function(err) {
        console.log(err);
        process.exit(0);
    });
}*/
