"use strict";

//http://frontendcollisionblog.com/javascript/2015/12/26/using-nodejs-to-upload-app-to-google-play.html
//https://googleapis.dev/nodejs/googleapis/latest/androidpublisher/classes/Resource$Edits$Apks-1.html#upload
//https://stackoverflow.com/questions/48274009/cant-upload-apk-to-google-play-developer-via-publisher-api

const googleapis = require("googleapis");

const authClient = new googleapis.auth.OAuth2(
    YOUR_CLIENT_ID,
    YOUR_CLIENT_SECRET,
    YOUR_REDIRECT_URL
);
  
// generate a url that asks permissions for Blogger and Google Calendar scopes
const scopes = [
'https://www.googleapis.com/auth/blogger',
'https://www.googleapis.com/auth/calendar'
];
  
const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',
  
    // If you only need one scope you can pass it as a string
    scope: scopes
  });



const publisher = googleapis.androidpublisher("v3");

const uploadParameters = {
    auth: authClient, // API_KEY??
    editId: {},
    media: {},
    packageName: "com.gameinsight."
};
const callback = ()=>{

};
publisher.edits.apks.upload(uploadParameters, callback);