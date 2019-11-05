"use strict";

const path = require("path")
const express = require("express")
const exphbs = require("express-handlebars")
const requestProm = require("request-promise")

const app = express()
const port = 3000


// Middlware обработчик, который принимает запрос, ответ и коллбек перехода к следующему обработчику
app.use((request, response, next) => {
    //console.log("Request headers:\n", request.headers)
    next()
})

// Middlware обработчик, который принимает запрос, ответ и коллбек перехода к следующему обработчику
app.use((request, response, next) => {
    request.chance = Math.random()
    next()
})

app.get("/", (request, response) => {
    //response.send("Hello from Express!")
    response.json({
        chance: request.chance
    })
})

app.get("/err", (request, response) => {
    throw new Error("oops")
})

// Обработчик ошибок должен быть самой последней функцией Middlware
app.use((err, request, response, next) => {
    // логирование ошибки, пока просто console.log
    //console.log(err)
    response.status(500).send("Something broke!")
})

app.engine(".hbs", exphbs({
    defaultLayout: "main",
    extname: ".hbs",
    layoutsDir: path.join(__dirname, "views/layouts")
}))
app.set("view engine", ".hbs")
app.set("views", path.join(__dirname, "views"))

app.get("/home", (request, response) => {
    const data = {
        url: "none",
        content: "none",
    };
    response.render("home", data)
})

app.get("/req", (req, httpResp) =>{
    /*requestProm(options).then(function (response) {
        const renderData = {
            url: myURL,
            content: response
        };
        response.render("home", renderData);
    }).catch(function (err) {
    });*/
    const reqFunc = async ()=>{
        var myURL = "http://devnulpavel.ddns.net/"
        const options = {
            method: "GET", // "POST"
            uri: myURL,
            qs: {
                getparam1: 10,
                getparam2: 20,
                getparam3: 'asc'
            },
            headers: {
                "User-Agent": "Request-Promise",
                "Authorization": "Basic QWxhZGRpbjpPcGVuU2VzYW1l"
            }
            // для разбора ответа сразу в JSON
            // json: true
            // Тело POST запроса
            /*body: {
                foo: "bar"
            },*/
        };
        try{
            const subResp = await requestProm(options);
            const renderData = {
                url: myURL,
                content: subResp
            };
            httpResp.render("home", renderData);
        }catch{
        }
    };
    reqFunc();
})

app.listen(port, (err) => {
    if (err) {
        return console.log("something bad happened", err)
    }
    console.log(`server is listening on ${port}`)
})