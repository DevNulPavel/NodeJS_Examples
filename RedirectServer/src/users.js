"use strict";

const fs = require("fs");
const express = require("express");

/////////////////////////////////////////////////////////////////////////////////////////////////

function renderUsers(req, res){
    res.render("users");
}

/////////////////////////////////////////////////////////////////////////////////////////////////

function getUsers(req, res){
    const exists = fs.existsSync("users.json");
    if(exists === false){
        const data = JSON.stringify([]);
        fs.writeFileSync("users.json", data);
    }
    const content = fs.readFileSync("users.json", "utf8");
    const users = JSON.parse(content);
    res.send(users);
}

function getUserInfo(req, res){
    const id = Number(req.params.id); // получаем id
    const content = fs.readFileSync("users.json", "utf8");
    const users = JSON.parse(content);
    let user = null;
    // находим в массиве пользователя по id
    for(let i = 0; i<users.length; i++){
        if(users[i].id === id){
            user = users[i];
            break;
        }
    }
    // отправляем пользователя
    if(user){
        res.send(user);
    }else{
        res.status(404).send();
    }
}

function postUsers(req, res) {   
    if(!req.body) {
        return res.sendStatus(400);
    }
    
    const userName = req.body.name;
    const userAge = req.body.age;
    const user = {name: userName, age: userAge};
    
    const data = fs.readFileSync("users.json", "utf8");
    const users = JSON.parse(data);
    
    // находим максимальный id
    let id = 0;
    if(users.length > 0){
        id = Math.max.apply(Math, users.map(function(o){
            return o.id;
        }));
    }

    // увеличиваем его на единицу
    user.id = id+1;
    // добавляем пользователя в массив
    users.push(user);
    const resData = JSON.stringify(users);
    // перезаписываем файл с новыми данными
    fs.writeFileSync("users.json", resData);
    res.send(user);
}

function deleteUser(req, res){
    const id = Number(req.params.id);
    const data = fs.readFileSync("users.json", "utf8");
    const users = JSON.parse(data);
    let index = -1;
    // находим индекс пользователя в массиве
    for(let i=0; i<users.length; i++){
        if(users[i].id === id){
            index = i;
            break;
        }
    }
    if(index > -1){
        // удаляем пользователя из массива по индексу
        const user = users.splice(index, 1)[0];
        const data = JSON.stringify(users);
        fs.writeFileSync("users.json", data);
        // отправляем удаленного пользователя
        res.send(user);
    }else{
        res.status(404).send();
    }
}

function putUsers(req, res){
    if(!req.body) {
        return res.sendStatus(400);
    }
    
    const userId = Number(req.body.id);
    const userName = req.body.name;
    const userAge = req.body.age;
    
    const data = fs.readFileSync("users.json", "utf8");
    const users = JSON.parse(data);
    let user;
    for(let i=0; i<users.length; i++){
        if(users[i].id === userId){
            user = users[i];
            break;
        }
    }
    // изменяем данные у пользователя
    if(user){
        user.age = userAge;
        user.name = userName;
        const data = JSON.stringify(users);
        fs.writeFileSync("users.json", data);
        res.send(user);
    }else{
        res.status(404).send(user);
    }
}

function setupHttp(httpApp){
    // Создаем парсер для данных application/x-www-form-urlencoded
    const jsonParser = express.json();

    // Rendering
    httpApp.get("/users", renderUsers);

    // RestAPI for users, // https://metanit.com/web/nodejs/4.11.php
    httpApp.get("/api/users", getUsers); // получение списка данных
    httpApp.get("/api/users/:id", getUserInfo); // получение одного пользователя по id
    httpApp.post("/api/users", jsonParser, postUsers); // получение отправленных данных
    httpApp.delete("/api/users/:id", deleteUser); // удаление пользователя по id
    httpApp.put("/api/users", jsonParser, putUsers); // изменение пользователя
}

module.exports = {
    setupHttp: setupHttp
};