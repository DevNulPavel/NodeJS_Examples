"use strict";

const readableCb = () => {
    let chunk;
    console.log('New data available');
    while((chunk = process.stdin.read()) !== null) {
        console.log(`Chunk read: (${chunk.length}) "${chunk.toString()}"`);
    }
};
const endCb = () => {
    process.stdout.write('End of stream');
}
process.stdin.on('readable', readableCb).on('end', endCb);
    