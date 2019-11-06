const fs = require('fs');
const m3u8stream = require('m3u8stream')

// https://developer.jwplayer.com/tools/stream-tester/
m3u8stream('https://content.jwplatform.com/manifests/yp34SRmf.m3u8').pipe(fs.createWriteStream('videofile.mp4'));