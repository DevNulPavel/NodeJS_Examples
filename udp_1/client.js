"use strict";

const udp = require('dgram');

const client = udp.createSocket('udp4');

client.on("listening", () => {
    console.log("listen");
});

client.on("message", (data, info) => {
    console.log("Data from " + info.address + ": " + data);
});

client.on("error", (err) => {
    console.log("Error: " + err);
});

client.on("close", () => {
    console.log("Closed");
});

client.bind(9998);

const buf1 = Buffer.from('start');
client.send(buf1, 9999, "localhost", (err) => {
});

setInterval(()=>{
    client.send("ping", 9999, "localhost", (err) => {
    }); 
}, 1000);