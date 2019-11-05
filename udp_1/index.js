"use strict";

const args = process.argv;
//console.log("Args: ", args);

if (args[2] == "-client") {
    console.log("Client starting...")
    const client = require("./clientSrc/client")
    client.run()
}

if (args[2] == "-server") {
    console.log("Server starting...")
    const client = require("./serverSrc/server")
    client.run()
}
