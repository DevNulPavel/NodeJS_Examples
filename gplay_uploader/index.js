"use strict";

const fs = require("fs");
// our handy library
const google = require("googleapis");


// see below in "Finding your secret.json" to find out how to get this
const key = require('../../../secret.json');

// any unique id will do; a timestamp is easiest
const EDIT_ID = "" + (new Date().getTime());

// editing "scope" allowed for OAuth2
const scopes = [
    'https://www.googleapis.com/auth/androidpublisher'
];


function startEdit(jwtClient, play) {
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
    const track = tracks[argv[0] || 'alpha'];
    
    return new Promise(function(resolve, reject) {
        play.edits.tracks.update({
            editId: edit.id,
            track: track,
            resource: {
                track: track,
                versionCodes: [+data.uploadResults.versionCode]
            }
        }, function(err, res) {
            if(err || !res) {
                reject(err);
            }
            
            resolve(_.extend(data, { setTrackResults: res }));
        });
    });
    
}

function commitToPlayStore(play, data) {
    return new Promise(function(resolve, reject) {
        play.edits.commit({
            editId: data.edit.id
        }, function(err, res) {
            if(err || !res) {
                reject(err);
            }
            
            resolve(_.extend(data, { commitToPlayStoreResults: res }));
        });
    });
}

function main(){
    // here, we'll initialize our client
    const oauth2Client = new google.auth.OAuth2();
    const jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, scopes, null);
    const play = google.androidpublisher({
        version: 'v3',
        auth: oauth2Client,
        params: {
            // default options
            // this is the package name for your initial app you've already set up on the Play Store
            packageName: 'com.example.app'
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
}

main();