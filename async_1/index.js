"use strict";

function makePromiseFunc(name, done, delay){
    // const done = (Math.random()*10) > 2;
    // const delay = 100 + (Math.random()*200) % 200;
    var promiseFunction = (resolve, reject) => {
        if (done) {
            setTimeout(resolve, delay, "success from " + name);
        } else {
            //throw new Error('Error'); // Можно бросить исключение
            setTimeout(reject, delay, "failed"); // Можно вызвать просто коллбек
        }
    };
    return promiseFunction;
}
const prom1 = new Promise(makePromiseFunc("name1", true, 120));
const prom2 = new Promise(makePromiseFunc("name1", false, 300));

console.log("Before");
/*Promise.all([prom1, prom2]).then(([res1, res2])=>{
    console.log("Success 1: " + res1);
    console.log("Success 2: " + res2);
}).catch((err)=>{
    console.log("Failed: " + err);
});*/
/*Promise.race([prom1, prom2]).then((res)=>{
    console.log("Success: " + res);
}).catch((err)=>{
    console.log("Failed: " + err);
});*/
async function waitFunc(){
    try {
        /*var [res1, res2] = await Promise.all([prom1, prom2]); // Засыпаем в этом месте до тех пор, пока у Future не будут все результаты
        console.log("Success 1: " + res1);
        console.log("Success 2: " + res2);*/
        var res = await Promise.race([prom1, prom2]);
        console.log("Success: " + res);
    }catch(err){
        console.log("Failed: " + err);
    }
}
waitFunc();
console.log("After");