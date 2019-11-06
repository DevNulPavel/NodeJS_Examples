"use strict";

const { fork } = require("child_process");

const worker = fork("./worker");

worker.on("message", (result) => {
    res.send("Hello Intense ${fruit}!");
    worker.kill();
});

worker.send("testMessage");


function listDirs(dirsToVisit, maxAtOnce) {
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
}