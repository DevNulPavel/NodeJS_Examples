"use strict";

const googleapis = require("googleapis");


async function createAuthClientFromFile(keyFile, scopes){
    // Описываем аутентификацию
    const authOptions = {
        keyFile: keyFile,  // Path to a .json, .pem, or .p12 key file
        scopes: scopes,      // Required scopes for the desired API request
        //keyFilename:      // Path to a .json, .pem, or .p12 key file
        //credentials;      // Object containing client_email and private_key properties
        //clientOptions;    // Options object passed to the constructor of the client
        //projectId;        // Your project ID.
    };
    const auth = new googleapis.google.auth.GoogleAuth(authOptions);
    const authClient = await auth.getClient();

    // Авторизуемся
    const сredentials = await authClient.authorize();
    authClient.setCredentials(сredentials);

    return authClient;
}

async function createAuthClientFromInfo(email, keyId, key, scopes){
    // Описываем аутентификацию
    const authOptions = {
        email: email,
        //keyFile?: string;
        key: key,
        keyId: keyId,
        scopes: scopes
        //subject?: string;
        //additionalClaims?: {};
    };
    const authClient = new googleapis.google.auth.JWT(authOptions);

    // Авторизуемся
    const сredentials = await authClient.authorize();
    authClient.setCredentials(сredentials);

    return authClient;
}

function setAuthGlobal(authClient){
    // Устанавливаем глобально auth клиента для всех запросов, чтобы не надо было каждый раз прокидывать в качестве параметра
    const globalParams = {
        auth: authClient
    };
    googleapis.google.options(globalParams);
}

module.exports = {
    createAuthClientFromFile,
    createAuthClientFromInfo,
    setAuthGlobal
};