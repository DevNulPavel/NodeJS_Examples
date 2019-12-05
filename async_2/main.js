"use strict";

const async = require("async");

async function main() {
    const concatRes = await async.concat(["dir1", "dir2", "dir3"], async (param)=>{
        return [param, param];
    });
    console.log(concatRes);

    const eachRes = await async.concat(["val1", "val2"], async (param)=>{
        return param + "!";
    });
    console.log(eachRes);

    const groupRes = await async.groupBy(["val1", "val2", "val3"], async (param)=>{
        if (param.endsWith("2")){
            return true;
        }
        return false;
    });
    console.log(groupRes);

    const sortResult = await async.sortBy(["123", "as", "asdasdas", "a", "asd"], async (param)=>{
        return param.length;
    });
    console.log(sortResult);

    const applyFunc = async.applyEach([async (param)=>{
        console.log(param);
        return param;
    }, async (param)=>{
        console.log(param);
        return param;
    }], "test");
    const results = await applyFunc();
    console.log(results);
}

main();