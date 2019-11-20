"use strict";

import googleapis = require("googleapis");
import { JWT } from "google-auth-library";


export async function createAuthClientFromFile(keyFile, scopes){
    // Описываем аутентификацию
    const auth = new googleapis.google.auth.GoogleAuth({
        keyFile: keyFile,  // Path to a .json, .pem, or .p12 key file
        scopes: scopes,      // Required scopes for the desired API request
        //keyFilename:      // Path to a .json, .pem, or .p12 key file
        //credentials;      // Object containing client_email and private_key properties
        //clientOptions;    // Options object passed to the constructor of the client
        //projectId;        // Your project ID.
    });
    const authClient = await auth.getClient() as JWT;

    // Авторизуемся
    const сredentials = await authClient.authorize();
    authClient.setCredentials(сredentials);

    return authClient;
}

export async function createAuthClientFromInfo(email, keyId, key, scopes){
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

export function setAuthGlobal(authClient){
    // Устанавливаем глобально auth клиента для всех запросов, чтобы не надо было каждый раз прокидывать в качестве параметра
    const globalParams = {
        auth: authClient
    };
    googleapis.google.options(globalParams);
}