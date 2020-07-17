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

export async function uploadBySSH(serverName: string, user: string, pass: string, keyFilePath: string, 
                                  filePaths: string[], paramServerDir: string, 
                                  progressCb: (number)=>void){
    //console.log(arguments);
    const resultProm = new Promise((resolve, reject)=>{
        const client = new ssh2.Client();
    
        // Убработчик успешного подключения
        // TODO: Вынести в отдельную функцию
        const onReadyFunc = async ()=>{
            let serverDir = paramServerDir;
            
            // console.log("ssh on ready");
            try{
                // Если путь относительно домашней папки, то надо обновить путь до абсолютного
                if(serverDir.startsWith("~")){
                    // console.log("ssh get user");
                    // eslint-disable-next-line promise/param-names
                    const getHomeFolderProm = new Promise<string>((localResolve, localReject)=>{
                        client.exec("echo ~$USER", (err, chan)=>{
                            if(!chan || err){
                                localReject(err);
                                // console.log("ssh get user failed");
                                return;
                            }

                            chan.on("data", (data)=>{
                                const dataStr = data.toString().replace("\n", "");
                                localResolve(dataStr);
                            });
                            chan.stderr.on("data", (data)=>{
                                localReject(data.toString());
                            });
                        });
                    });
                    const homeFolderPath: string = await getHomeFolderProm;
                    serverDir = serverDir.replace("~", homeFolderPath);
                }
                
                // console.log("sftp");

                /*const ok = client.sftp((err, sftp)=>{
                    setTimeout(()=>{
                        console.log(`sftp error: ${err}`);
                        if (err) {
                            throw err;
                        }
                        console.log(`sftp object: ${sftp}`);
    
                        // https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
                        let uploadConfig = {
                            concurrency: 1,
                            chunkSize: 1024 * 8
                        };
                        if(progressCb){
                            const fileUploadProgressCb = (totalTransfered, chunkSize)=>{
                                progressCb(chunkSize);
                            };
                            uploadConfig["step"] = fileUploadProgressCb;
                        }
    
                        let upload = (i)=>{
                            if (i < filePaths.length) {
                                const localFilePath = filePaths[i];
                                const fileName = path.basename(localFilePath);
                                const remoteFilePath = path.join(serverDir, fileName);
                                
                                console.log(`upload ${localFilePath}, ${fileName}, ${remoteFilePath}`);
                                sftp.fastPut(localFilePath, remoteFilePath, uploadConfig, (err) => {
                                    console.log(`${err}`);
                                    
                                    i += 1;
                                    upload(i);
                                });                                
                            }else{
                                resolve();
                                client.end();
                            }
                        };
                        upload(0);                        
                    }, 500);
                });
                console.log(`Is ok: ${ok}`);*/

                // Создание папки руками
                //const execFunc = util.promisify(client.exec.bind(client));
                //await execFunc(`mkdir -p ${serverDir}`);

                const sftpFunc = util.promisify(client.sftp.bind(client));

                let sftp = undefined;
                try{
                    sftp = await sftpFunc();
                }catch(err){
                    reject(err);
                    return;
                }

                const mkdirFunc = util.promisify(sftp.mkdir.bind(sftp));
                const fastPutFunc = util.promisify(sftp.fastPut.bind(sftp));                
                
                // Создаем папку с помощью SFTP
                try{
                    // Если папка уже есть, то OK
                    await mkdirFunc(serverDir);
                    // console.log("ssh makedir");
                }catch(err){
                }

                // https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
                let uploadConfig = {
                    concurrency: 1,
                    chunkSize: 1024 * 8
                };
                if(progressCb){
                    const fileUploadProgressCb = (totalTransfered, chunkSize)=>{
                        progressCb(chunkSize);
                    };
                    uploadConfig["step"] = fileUploadProgressCb;
                }

                //console.log("ssh upload");
        
                for(let i = 0; i < filePaths.length; i++){
                    const localFilePath = filePaths[i];
                    const fileName = path.basename(localFilePath);
                    const remoteFilePath = path.join(serverDir, fileName);

                    //console.log(`upload ${localFilePath}, ${fileName}, ${remoteFilePath}`);

                    await fastPutFunc(localFilePath, remoteFilePath, uploadConfig);
                }
        
                resolve();
                client.end();
            }catch(err){
                reject(err);
                client.end();
            }finally{
            }
        };
        client.on("ready", onReadyFunc);
        client.on("error", reject);
        client.on("timeout", reject);
        client.on("continue", ()=>{
            //console.log("ssh continue");
        });
        client.on("connect", ()=>{
            //console.log("ssh connect");
        });
        
        // Выполняем подключение
        const connectConfig: ssh2.ConnectConfig = {
            host: serverName,
            port: 22,
            username: user,
            keepaliveCountMax: 5,
            compress: false,
            keepaliveInterval: 100,
            readyTimeout: 4000
            /*debug: (text)=>{
                console.log(text);
            }*/
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
