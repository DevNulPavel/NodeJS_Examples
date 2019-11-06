"use strict";

const workerThreads = require("worker_threads")

if(workerThreads.isMainThread == false){
    const workerCreationData = workerThreads.workerData;
    console.log("Worker creation data: ", workerCreationData);

    var totalReceivedMessages = 0;

    if(workerThreads.parentPort !== null){
        console.log("Worker port setup");
        workerThreads.parentPort.on("message", (data)=>{
            console.log("Received message in worker:", data)

            workerThreads.parentPort.postMessage("Received data");

            totalReceivedMessages += 1;

            if (totalReceivedMessages >= 2){
                workerThreads.parentPort.close();
            }
        });
        workerThreads.parentPort.on("close", ()=>{
            console.log("Port closed")
        });
    }else{
        console.log("Worker NO port");
    }
}
