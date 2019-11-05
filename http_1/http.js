"use strict";

const http = require("http");
const port = 3000

const requestHandler = (request, response) => {
    debugger
    console.log(request.url)
    response.end('Hello Node.js Server!')
}

const serverStartHandler = (err) => {
    debugger
    if (err) {
        return console.log('something bad happened', err)
    }
    console.log(`server is listening on ${port}`)
}

const server = http.createServer(requestHandler)
server.listen(port, serverStartHandler)