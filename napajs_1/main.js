"use strict";

const napa = require("napajs");

const zone1 = napa.zone.create("zone1", { 
    workers: 4 
});

function threadFunction(data){
    if(typeof(data) === "string"){
        data = data.toUpperCase();
    }else if(typeof(data) === "number"){
        data *= 100;
    }else {
        console.log("Unknown type");
    }

    return data;
}

async function main() {
    // Broadcast code to all 4 workers in 'zone1'.
    //zone1.broadcast('console.log("hello world");');

    // Execute an anonymous function in any worker thread in 'zone1'.
    const threadParameters = [
        "Test text"
    ];
    const promise = zone1.execute(threadFunction, threadParameters);

    const result = await promise;
    console.log(result);
}

main();