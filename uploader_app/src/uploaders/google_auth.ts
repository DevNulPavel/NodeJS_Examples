"use strict";

import googleapis = require("googleapis");
import google_auth_library = require("google-auth-library");
//import { JWT } from "google-auth-library";


export async function createAuthClientFromFile(keyFile: string, scopes: string[]): Promise<google_auth_library.JWT>{
    // Описываем аутентификацию
    // TODO: может быть надо заменить на GoogleAuth библиотеку?
    const auth = new googleapis.google.auth.GoogleAuth({
        keyFile: keyFile,  // Path to a .json, .pem, or .p12 key file
        scopes: scopes,      // Required scopes for the desired API request
        //keyFilename:      // Path to a .json, .pem, or .p12 key file
        //credentials;      // Object containing client_email and private_key properties
        //clientOptions;    // Options object passed to the constructor of the client
        //projectId;        // Your project ID.
    });
    const authClient = await auth.getClient() as google_auth_library.JWT;

    // Авторизуемся
    const сredentials = await authClient.authorize();
    authClient.setCredentials(сredentials);

    return authClient;
}

export async function createAuthClientFromInfo(email: string, keyId: string, key: string, scopes: string[]): Promise<google_auth_library.JWT>{
    // Описываем аутентификацию
    // TODO: может быть надо заменить на GoogleAuth библиотеку?
    const authClient = new googleapis.google.auth.JWT({
        email: email,
        //keyFile?: string;
        key: key,
        keyId: keyId,
        scopes: scopes
        //subject?: string;
        //additionalClaims?: {};
    }) as google_auth_library.JWT;

    // Авторизуемся
    const сredentials = await authClient.authorize();
    authClient.setCredentials(сredentials);

    return authClient;
}

export function setAuthGlobal(authClient): void{
    // Устанавливаем глобально auth клиента для всех запросов, чтобы не надо было каждый раз прокидывать в качестве параметра
    const globalParams = {
        auth: authClient
    };
    googleapis.google.options(globalParams);
}