"use strict";

const fs = require("fs");
const net = require("net");
const onvif = require("node-onvif");
const ffmpeg = require("fluent-ffmpeg");
const request = require("request");

console.log('Start the discovery process.');
// Find the ONVIF network cameras.
// It will take about 3 seconds.
onvif.startProbe().then((device_info_list) => {
    console.log(device_info_list.length + ' devices were found:');
    // Show the device name and the URL of the end point.
    device_info_list.forEach((info) => {
        console.log('* ' + info.urn);
        console.log('  - ' + info.name);
        console.log('  - ' + info.xaddrs[0]);
    });
}).catch((error) => {
    console.error(error);
});

// Create an OnvifDevice object
let device = new onvif.OnvifDevice({
    xaddr: 'http://192.168.1.3:10080/onvif/device_service',
    user : '',
    pass : ''
});

// Initialize the OnvifDevice object
device.init().then((info) => {
    // Show the detailed information of the device.
    console.log(JSON.stringify(info, null, '  '));

    // Get the UDP stream URL
    let url = device.getUdpStreamUrl();
    console.log(url);
}).catch((error) => {
    console.error(error);
});
