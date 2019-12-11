"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const expressHandlebars = require("express-handlebars");
const bodyParser = require("body-parser");


const HTTP_PORT = 8080;
const STATIC_DIR = path.join(__dirname, "site/static/");
const LAYOUTS_DIR = path.join(__dirname, "site/layouts/");
const PARTIALS_DIR = path.join(__dirname, "site/partials/"); // Путь к частам главной страницы
const VIEWS_DIR = path.join(__dirname, "site/views/"); // Путь к вьюшкам, которые рендерятся


function renderIndex(req, res) {
    res.render("index");
}

function redirectOnPage(req, res) {
    //console.log(req);
    const redirectUrl = req.query.value;
    if(redirectUrl){
        console.log(`Redirect on ${redirectUrl}`);
        res.redirect(redirectUrl);
    }else{
        res.render("redirect_failed");
    }
}

function renderServerStat(req, res){
    res.render("server_stats");
}

function renderServerStatForServer(req, res){
    const pathParameter = req.params["server_name"];
    const data = {
        message: pathParameter
    };
    res.render("debug_message", data);
}

function renderRegisterForm(req, res){
    res.render("register_form");
}

function renderUsers(req, res){
    res.render("users");
}

/////////////////////////////////////////////////////////////////////////////////////////////////

function registerUser(req, res){
    if(!req.body) {
        return res.sendStatus(400);
    }
    const data = {
        content_is_visible: true,
        age: req.body.user_age,
        name: req.body.user_name,
        emails: ["email1", "email2"]
    };
    res.render("register_result", data);
}

function registerUserJson(req, res){
    console.log(req.body);
    if(!req.body) {
        return res.sendStatus(400);
    }
    // Следует отметить, что в принципе мы можем отправить объект и с помощью стандартного метода response.send(request.body). 
    // В реальности метод response.json() устанавливает для заголовка "Content-Type" значение "application/json", 
    // серилизует данные в json с помощью функции JSON.stringify() и затем отправляет данные с помощью response.send().
    res.json(req.body); // отправляем пришедший ответ обратно
}

function getTimeForTemplate(){
    //console.log("getTimeForTemplate");
    const myDate = new Date();
    const hour = myDate.getHours();
    let minute = myDate.getMinutes();
    let second = myDate.getSeconds();
    if (minute < 10) {
        minute = "0" + minute;
    }
    if (second < 10) {
        second = "0" + second;
    }
    return hour + ":" + minute + ":" + second;
    // TODO: надо использовать expressHandlebars
    //return new hbs.SafeString("<div>" + text + "</div>");
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

/////////////////////////////////////////////////////////////////////////////////////////////////

function setupHttpServer(){
    const httpApp = express();

    // Устанавливаем middleware обработчик + путь к статике
    // middleware нужен для промежуточной обработки запросов
    httpApp.use(function(request, response, next){
        //console.log("Debug middleware 1");
        next(); // Можно не вызывать next, если нам не надо дальше обрабатывать
    });
    httpApp.use(express.static(STATIC_DIR));

    // TODO: не работает
    // Регистрируем вспомогаетельные функции по работе с шаблонами

    // настраиваем движок работы с шаблонами
    httpApp.engine("hbs", expressHandlebars({
        defaultLayout: "layout",
        extname: "hbs", 
        layoutsDir: LAYOUTS_DIR,
        partialsDir: PARTIALS_DIR,
        // Хелперы нужны для того, чтобы использовать JS коллбеки внутри шаблонов при формировании текста
        helpers:{
            "getTime": getTimeForTemplate
        }
    }));
    
    // Выставляем движок обработки шаблонов и папку с вьюшками (шаблонами)
    httpApp.set("view engine", "hbs"); // hbs, ejs - указывается имя движка
    httpApp.set("views", VIEWS_DIR);
    
    // Устанавливаем Middlware для парсинга полей POST запросов
    // Создаем парсер для данных application/x-www-form-urlencoded
    const urlEncodedParser = bodyParser.urlencoded({extended: false});
    //httpApp.use(urlEncodedParser); // Так же можно передавать каждый раз парсер при установке POST обработчика вторым параметром

    // Создаем парсер для данных application/x-www-form-urlencoded
    const jsonParser = express.json();
    //httpApp.use(urlEncodedParser); // Так же можно передавать каждый раз парсер при установке POST обработчика вторым параметром

    // Установка Middleware обработчиков для путей
    httpApp.use("/server_stat", (req, res, next)=>{
        //console.log("Server stat middleware 1");
        //res.status(404).send("Not found"); // Можно кидать сообщение об ошибке
        //req.metainfo = {test: 123}; // Можно добавлять разную метанформацию
        next();
    });

    // Устанавливаем обработчики путей
    // Мы можем использовать регулярки для работы с путями
    httpApp.get("/", renderIndex);
    httpApp.get("/redirect(.html)?", redirectOnPage);
    httpApp.get("/test_register", renderRegisterForm);
    httpApp.get("/users", renderUsers);

    // Определяем Router для статистики сервера, Router нужен для обработки дочерних путей
    const productRouter = express.Router();
    productRouter.get("/", renderServerStat);
    productRouter.get("/:server_name", renderServerStatForServer); // Так же мы можем задействовать параметры в пути, они помечаются двоеточием
    httpApp.use("/server_stat", productRouter);

    // Установка POST обработчиков
    httpApp.post("/test_register", urlEncodedParser, registerUser);
    httpApp.post("/test_register_json", jsonParser, registerUserJson); 

    // RestAPI
    // https://metanit.com/web/nodejs/4.11.php
    httpApp.get("/api/users", getUsers); // получение списка данных
    httpApp.get("/api/users/:id", getUserInfo); // получение одного пользователя по id
    httpApp.post("/api/users", jsonParser, postUsers); // получение отправленных данных
    httpApp.delete("/api/users/:id", deleteUser); // удаление пользователя по id
    httpApp.put("/api/users", jsonParser, putUsers); // изменение пользователя

    // TODO: Test code
    // httpApp.get("/redirect", (req, res)=>{
    //     console.log(req);
    // });

    // Запускаем в работу
    httpApp.listen(HTTP_PORT, (err)=>{
        if(err){
            throw err;
        }
        console.log("Http server is running");
    });
}

function main() {
    setupHttpServer();

    // TODO: Не забыть назначить обработчики прерываний
}

main();