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
    
    // auto на коллбеках
    async.auto({
        getInfo: (callback)=>{
            callback(null, "testText");
        },
        updateData: ["getInfo", (results, callback)=>{
            callback(null, results.getInfo + "Text");
        }],
        printData: ["updateData", (results, callback)=>{
            callback(null, results.updateData + "Again")
        }]
    }, (err, result)=>{
        console.log(result);
    });

    // auto на async
    const autoResults = await async.auto({
        getInfo: async ()=>{
            return "testText";
        },
        updateData: ["getInfo", async (results)=>{
            return results.getInfo + "Text";
        }],
        printData: ["updateData", async (results, callback)=>{
            return results.updateData + "Again";
        }]
    });
    console.log(autoResults);

    // Вкидывает задачи постепенно, запускаются при ожидании, ограничиваем количество задач
    const cargo = async.cargo(async (tasks)=>{
        for (let i=0; i<tasks.length; i++){
            console.log(tasks[i].name);
        }
        console.log("Complete");
    }, 4);
    // TODO: Фактический вызов будет через EventLoop уже после
    cargo.push({name: "test1"});
    cargo.push({name: "test2"});
    await cargo.push({name: "test3"}); // Но можно добавить await на push

    const funcAdd1 = async (n)=>{
        return n + 1;
    }
    const funcMul2 = async (n)=>{
        return n * 2;
    }
    const add1Mul2 = async.compose(funcMul2, funcAdd1); // Функции вызываются в обратном порядке, с конца
    const composeRes = await add1Mul2(1);
    console.log("Compose:", composeRes);

    // Повторно вызывает функцию до тех пор, пока не будет успешной
    let tryCount = 0;
    async.retry({times: 5, interval: 1000}, async ()=>{
        tryCount += 1;
        if(tryCount < 3){
            throw new Error("123");
        }
        console.log("Test: " + tryCount);
    })
}

main();