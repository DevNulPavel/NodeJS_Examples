"use strict";

const server = require("./server/server");


function stopAll(){
    server.stopServer(()=>{
        console.log("\nServer stopped");

        // eslint-disable-next-line no-process-exit
        process.exit();
    });
}

function main(){
    server.runServer();
    
    process.on("SIGINT", stopAll);
    process.on("SIGTERM", stopAll);
}

main();