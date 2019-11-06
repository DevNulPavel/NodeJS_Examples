"use strict";

//const child_process = require("child_process");
const workerThreads = require("worker_threads");


/*function runChildProcess(){
    const worker = child_process.fork("./worker");
    worker.on("message", (result) => {
        res.send("Hello Intense ${fruit}!");
        worker.kill();
    });
    worker.send("testMessage");    
}
runChildProcess();*/

function runThread(){
    console.log(__dirname);

    const workerOptions = {
        workerData: {data: "workerCreateData"}
    };

    const worker = new workerThreads.Worker("./worker.js", workerOptions);
    worker.on("online", ()=>{
        console.log("Worker is online");
    });
    worker.on("message", (data)=>{
        console.log("Message from worker");
    });
    worker.on("error", (err)=>{
        console.log("Error from worker:", err);
    });
    worker.on("exit", (exitCode) =>{
        console.log("Exit from worker");
    });

    worker.postMessage("test message 1");
    worker.postMessage("test message 2");
}

runThread();

/*function listDirs(dirsToVisit, maxAtOnce) {
    let numRunning = 0;
    let index = 0;

    function runMore() {
        // while we need to start more, start more of them
        while (numRunning < maxAtOnce && index < dirsToVisit.length) {
            ++numRunning;
            const ls = spawn("ls", [dirsToVisit[index++]]);
            ls.on("close", code => {
                --numRunning;
                console.log(`Finished with code ${code}`);
                runMore();
            }).on("error", err => {
                --numRunning;
                runMore();
            });
        }
        if (numRunning === 0) {
            // all done with all requests here
        }
    }
    runMore();
}*/