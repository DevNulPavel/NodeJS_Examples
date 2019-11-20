"use strict";

import child_process = require("child_process");



const ALTOOL_PATH = "/Applications/Xcode.app/Contents/Applications/Application Loader.app/Contents/Frameworks/ITunesSoftwareService.framework/Support/altool";

export async function uploadToIOSAppStore(user: string, pass: string, ipaFilePath: string){
    /*#!/bin/bash -ex

    ALTOOL_PATH="/Applications/Xcode.app/Contents/Applications/Application Loader.app/Contents/Frameworks/ITunesSoftwareService.framework/Support/altool"
    IPA_DIR="$HOME/IPAs_build"
    IPA_PATH="$IPA_DIR/$IPA_NAME"
    ls -lat "$IPA_DIR"
    #| grep ".ipa" | true
    if [ -f $IPA_PATH ]; then
    "$ALTOOL_PATH" --upload-app -f  "$IPA_PATH" -u $USER -p $PASS
    fi*/

    const promise = new Promise((resolve, reject)=>{
        let result = Buffer.alloc(0);
        const parameters = [
            "--upload-app",
            "-f",
            ipaFilePath,
            "-u",
            user,
            "-p",
            pass
        ];
        const toolProcess = child_process.spawn(ALTOOL_PATH, parameters, {
            shell: true,
            env: process.env
        });
        /*const parameters = [
            "-l",
            "-a",
            "~"
        ];
        const toolProcess = child_process.spawn("ls", parameters, {
            shell: true,
            env: process.env
        });*/
        toolProcess.on("disconnect", reject);
        toolProcess.on("error", reject);
        toolProcess.stdout.on("data", (message)=>{
            result = Buffer.concat([result, message]);
        });
        toolProcess.stderr.on("data", (message) => {
            result = Buffer.concat([result, message]);
        });
        toolProcess.on("close", (code)=>{
            const text = result.slice(0, -1).toString();
            if (code === 0){
                resolve(text);
            }else{
                reject(text);
            }
        });
    });
    return await promise;
}
