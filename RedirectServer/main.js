"use strict";

const path = require("path");
const express = require("express");
const expressHandlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const jenkins = require("./src/jenkins");
const serverStat = require("./src/server_stat");

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

function renderRegisterForm(req, res){
    res.render("register_form");
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
    return "Time:" + hour + ":" + minute + ":" + second;
    // TODO: надо использовать expressHandlebars
    //return new hbs.SafeString("<div>" + text + "</div>");
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

    // Устанавливаем обработчики путей
    // Мы можем использовать регулярки для работы с путями
    httpApp.get("/", renderIndex);
    httpApp.get("/redirect(.html)?", redirectOnPage);
    httpApp.get("/test_register", renderRegisterForm);

    // Установка POST обработчиков
    httpApp.post("/test_register", urlEncodedParser, registerUser);
    httpApp.post("/test_register_json", jsonParser, registerUserJson); 

    // Настраиваем все для работы со статистикой сервера
    serverStat.setupHttp(httpApp);

    // Настраиваем все для работы с Jenkins
    jenkins.setupHttp(httpApp);

    // Запускаем в работу
    httpApp.listen(HTTP_PORT, (err)=>{
        if(err){
            throw err;
        }
        console.log("Http server is running");
    });
}

function main() {
    jenkins.connectToJenkins();

    setupHttpServer();

    // TODO: Не забыть назначить обработчики прерываний
}

main();