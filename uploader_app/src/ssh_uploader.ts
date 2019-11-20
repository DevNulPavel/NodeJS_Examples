"use strict";

import util = require("util");
import fs = require("fs");
import path = require("path");
import ssh2 = require("ssh2");


/*if(serverDir.includes("~")){
    client.exec("echo ~$USER", (err, chan)=>{
        chan.on("data", (data)=>{
            const dataStr = data.toString().replace("\n", "");
            console.log(dataStr);
            serverDir = serverDir.replace("~", dataStr);
            console.log(serverDir);
        });
    });
}
client.exec(`mkdir -p ${serverDir}`, (err, chan)=>{
    if(err){
        console.log("MakeDir failed");
        return;
    }
    console.log("MakeDir success");
    chan.pipe(process.stdout);

    client.sftp((err, sftp)=>{
        if(err){
            console.log("Sftp failed");
            return;
        }
        console.log("Sftp success");
        
        const localFilePath = filePaths[0];
        const fileName = path.basename(localFilePath);
        const remoteFilePath = path.join(serverDir, fileName);
        console.log(localFilePath);
        console.log(remoteFilePath);
        sftp.fastPut(localFilePath, remoteFilePath, (err)=>{
            if(err){
                console.log(err);
            }

            sftp.end();
            client.end();
        });
    });
});
return;*/

export async function uploadBySSH(serverName, user, pass, keyFilePath, filePaths, paramServerDir, progressCb){
    //console.log(arguments);
    const resultProm = new Promise((resolve, reject)=>{
        const client = new ssh2.Client();
    
        // Убработчик успешного подключения
        // TODO: Вынести в отдельную функцию
        const onReadyFunc = async ()=>{
            let serverDir = paramServerDir;
            
            try{
                // Если путь относительно домашней папки, то надо обновить путь до абсолютного
                if(serverDir.startsWith("~")){
                    // eslint-disable-next-line promise/param-names
                    const getHomeFolderProm = new Promise((localResolve, localReject)=>{
                        client.exec("echo ~$USER", (err, chan)=>{
                            chan.on("data", (data)=>{
                                const dataStr = data.toString().replace("\n", "");
                                localResolve(dataStr);
                            });
                            chan.stderr.on("data", (data)=>{
                                localReject(data.toString());
                            });
                        });
                    });
                    const homeFolderPath = await getHomeFolderProm;
                    serverDir = serverDir.replace("~", homeFolderPath);
                }
    
                const execFunc = util.promisify(client.exec.bind(client));
                await execFunc(`mkdir -p ${serverDir}`);
        
                const sftpFunc = util.promisify(client.sftp.bind(client));
                
                const sftp = await sftpFunc();
                const fastPutFunc = util.promisify(sftp.fastPut.bind(sftp));
                
                let uploadConfig = undefined;
                if(progressCb){
                    const fileUploadProgressCb = (totalTransfered, chunkSize)=>{
                        progressCb(chunkSize);
                    };
                    uploadConfig = { 
                        step: fileUploadProgressCb 
                    };
                }
        
                for(let i = 0; i < filePaths.length; i++){
                    const localFilePath = filePaths[i];
                    const fileName = path.basename(localFilePath);
                    const remoteFilePath = path.join(serverDir, fileName);
                    await fastPutFunc(localFilePath, remoteFilePath, uploadConfig);
                }
        
                resolve();
            }finally{
                client.end();
            }
        };
        client.on("ready", onReadyFunc);
        client.on("error", reject);
        client.on("timeout", reject);
        
        // Выполняем подключение
        const connectConfig: ssh2.ConnectConfig = {
            host: serverName,
            port: 22,
            username: user
        };
        if(pass && (pass.length > 0)){
            connectConfig.password = pass;
        }else if(keyFilePath && (keyFilePath.length > 0)){
            connectConfig.privateKey = fs.readFileSync(keyFilePath);
        }else{
            throw Error("No SSH auth information");
        }
        client.connect(connectConfig);
    });
    return await resultProm;
}
