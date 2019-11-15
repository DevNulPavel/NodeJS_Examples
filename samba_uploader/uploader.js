"use strict";

const util = require("util");
const fs = require("fs");
const path = require("path");
const ssh2 = require("ssh2")


async function onSSHConnected(client){
}


async function uploadToSamba(serverName, user, pass, keyFilePath, serverDir, filePaths, appname, version, progressCb){
    //console.log(arguments);

    const client = new ssh2.Client();
        
    // Убработчик успешного подключения
    const onReadyFunc = async ()=>{
        //console.log("Auth success");

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

        try{
            // Если путь относительно домашней папки, то надо обновить путь до абсолютного
            if(serverDir.startsWith("~")){
                const getHomeFolderProm = new Promise((resolve, reject)=>{
                    client.exec("echo ~$USER", (err, chan)=>{
                        chan.on("data", (data)=>{
                            const dataStr = data.toString().replace("\n", "");
                            resolve(dataStr);
                        });
                        chan.stderr.on("data", (data)=>{
                            reject(data.toString());
                        })
                    });
                });
                const homeFolderPath = await getHomeFolderProm;
                serverDir = serverDir.replace("~", homeFolderPath);
            }

            const execFunc = util.promisify(client.exec.bind(client));
            await execFunc(`mkdir -p ${serverDir}`);
            //console.log("mkdir success");
    
            const sftpFunc = util.promisify(client.sftp.bind(client));
            
            const sftp = await sftpFunc();
            const fastPutFunc = util.promisify(sftp.fastPut.bind(sftp));
    
            //console.log("SFTP success");
    
            let uploadConfig = undefined;
            if(progressCb){
                let totalUploaded = 0;
                const fileUploadProgressCb = (totalTransfered, chunkSize, total)=>{
                    totalUploaded += chunkSize;
                    progressCb(totalUploaded);
                }
                uploadConfig = { 
                    step: fileUploadProgressCb 
                }
            }
    
            //console.log("Upload start");
    
            for(let i = 0; i < filePaths.length; i++){
                const localFilePath = filePaths[i];
                //console.log("Start", localFilePath);
                const fileName = path.basename(localFilePath);
                const remoteFilePath = path.join(serverDir, fileName);
                await fastPutFunc(localFilePath, remoteFilePath, uploadConfig);
                //console.log("End", localFilePath);
            }
    
            //console.log("Upload end");
        }finally{
            client.end();
        }
    };
    client.on("ready", onReadyFunc);
    
    // Выполняем подключение
    const connectConfig = {
        host: serverName,
        port: 22,
        username: user
    };
    //console.log(pass);
    //console.log(keyFilePath);
    if(pass && (pass.length > 0)){
        connectConfig.password = pass;
    }else if(keyFilePath && (keyFilePath.length > 0)){
        connectConfig.privateKey = fs.readFileSync(keyFilePath);
    }else{
        throw Error("No SSH auth information");
    }
    client.connect(connectConfig);
}

module.exports = {
    uploadToSamba
}

