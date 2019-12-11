"use strict";

const path = require("path");
const express = require("express");
const expressHandlebars = require("express-handlebars");
const bodyParser = require("body-parser");


const HTTP_PORT = 8080;
const STATIC_DIR = path.join(__dirname, "site/static/");
const LAYOUTS_DIR = path.join(__dirname, "site/");
const PARTIALS_DIR = path.join(__dirname, "site/");
const VIEWS_DIR = path.join(__dirname, "site/templates/");


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
    res.render("register_form_js");
}

function registerUser(req, res){
    if(!req.body) {
        return res.sendStatus(400);
    }
    const data = {
        age: req.body.user_age,
        name: req.body.user_name,
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

function setupHttpServer(){
    const httpApp = express();

    // Устанавливаем middleware обработчик + путь к статике
    // middleware нужен для промежуточной обработки запросов
    httpApp.use(function(request, response, next){
        //console.log("Debug middleware 1");
        next(); // Можно не вызывать next, если нам не надо дальше обрабатывать
    });
    httpApp.use(express.static(STATIC_DIR));

    // Устанавливаем движок работы с шаблонами
    httpApp.engine(".hbs", expressHandlebars({
        defaultLayout: "layout",
        extname: ".hbs", 
        layoutsDir: LAYOUTS_DIR,
        partialsDir: PARTIALS_DIR,
    }));
    
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

    // Определяем Router для статистики сервера, Router нужен для обработки дочерних путей
    const productRouter = express.Router();
    productRouter.get("/", renderServerStat);
    productRouter.get("/:server_name", renderServerStatForServer); // Так же мы можем задействовать параметры в пути, они помечаются двоеточием
    httpApp.use("/server_stat", productRouter);

    // Установка POST обработчиков
    httpApp.post("/test_register", urlEncodedParser, registerUser);
    httpApp.post("/test_register_json", jsonParser, registerUserJson); 

    // TODO: Test code
    // httpApp.get("/redirect", (req, res)=>{
    //     console.log(req);
    // });

    // TODO: ???
    httpApp.set("view engine", ".hbs");
    httpApp.set("views", VIEWS_DIR);

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