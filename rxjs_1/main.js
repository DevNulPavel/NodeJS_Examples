"use strict";

const rxjs = require("rxjs");
const rxjsOp = require("rxjs/operators");

function main(){
    rxjs.range(0, 10).pipe(
        rxjsOp.filter((x)=>{
            return x > 2;
        }),
        rxjsOp.map((x)=>{
            return x * 10;
        })
    ).subscribe((x)=>{
        console.log(x);
    });
}

main();