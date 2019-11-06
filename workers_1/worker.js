"use strict";

const { sleep } = require('sleep');

process.on("message", (message) => {
    sleep(5);
    process.send( "Answer" );
});