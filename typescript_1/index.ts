import * as fs from "fs"; // TypeScript
//import fs from "fs"; // import * fs from "fs"; // JavaScript

interface PersonType{
    value1: number;
    value2: string;
    value3?: any;
}

// Желательно использовать именно его
const enum MyEnum1{
    VAL0 = 0,
    VAL1,
    VAL2
}

// Такое лучше не надо, разворачивается в сложный код
enum MyEnum2{
    VAL0 = 0,
    VAL1,
    VAL2
}


function greeter(person: string) {
    return "Hello, " + person;
}

function testInterface(person: PersonType) {
    return "Interface value: " + person.value2;
}

const user: string = "User";
const value: number = 123;
const testObject1: PersonType = {
    value1: 132,
    value2: "asd",
    value3: 123123
};
const testObject2 = {
    value1: 123,
    value2: 12312,
    value3: "asdas"
};

console.log(greeter(user));
console.log(testInterface(testObject1));

const fileStats = fs.statSync(__filename);
console.log(fileStats);

let testStr1 = "test1";
let testStr2 = "test1";
let testStr3 = testStr1;
let testStr4 = "";
Object.assign(testStr4, testStr3);
if(testStr3 === testStr4){
    console.log("Equal");
}else{
    console.log("Not equal");
}

process.exit(0);