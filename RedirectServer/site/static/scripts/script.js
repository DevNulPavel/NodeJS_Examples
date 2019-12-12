"use strict";

// eslint-disable-next-line node/no-missing-require
//const $ = require("jquery");

// создание строки для таблицы
function row(user) {
    // TODO: Шаблон какой-нибудь???
    return "<tr data-rowid='" + user.id + "'><td>" + user.id + "</td>" +
            "<td>" + user.name + "</td> <td>" + user.age + "</td>" +
            "<td><a class='editLink' data-id='" + user.id + "'>Изменить</a> | " +
            "<a class='removeLink' data-id='" + user.id + "'>Удалить</a></td></tr>";
}

// сброс формы
function reset() {
    const form = document.forms["userForm"];
    form.reset();
    form.elements["id"].value = 0;
}

// Получение всех пользователей
function getUsers() {
    // Выполняем GET запрос для получния списка пользователей
    fetch("/api/users", {
        method: "GET",
        contentType: "application/json"
    }).then((usersData)=>{
        // Преобразуем в Json
        const users = usersData.json();
        return users;
    }).then((users)=>{
        console.log(users);
        let rows = "";
        users.forEach((user) => {
            rows += row(user); // добавляем полученные элементы к строке
        });
        // Добавляем строки к таблице
        const tablebody = document.querySelector("#users_table_data");
        tablebody.innerHTML = rows;
        //$("#users_table_data").append(rows);
        return;
    }).catch((err)=>{
        console.log("Failed: " + err);
    });
}
// Получение одного пользователя
async function getUser(id) {
    const response = await fetch("/api/users/"+id, {
        method: "GET",
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
    });

    if (response.ok) { // если HTTP-статус в диапазоне 200-299
        // получаем тело ответа (см. про этот метод ниже)
        const user = await response.json();
        // После ответа с сервера обновляем поля на странице
        const form = document.forms["userForm"];
        form.elements["id"].value = user.id;
        form.elements["name"].value = user.name;
        form.elements["age"].value = user.age;
    } else {
        console.log("Failed: " + response.status);
    }
}

async function downloadUserImage(userId){
    const response = await fetch("/article/fetch/logo-fetch.svg");

    // Скачиваем как Blob-объект
    const blob = await response.blob();

    // Создаём <img>
    const img = document.createElement("img");
    img.style = "position:fixed;top:10px;left:10px;width:100px";
    document.body.append(img);

    // Выводим на экран
    img.src = URL.createObjectURL(blob);

    // Прячем через три секунды
    setTimeout(() => {
        img.remove();
        URL.revokeObjectURL(img.src);
    }, 3000);
}

// Добавление пользователя
async function сreateUser(userName, userAge) {
    const response = await fetch("api/users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify({
            name: userName,
            age: userAge
        })
    });

    if(response.ok){
        const user = await response.json();
        console.log(user);
        reset();
        // TODO: Убрать jQuery
        $("#users_table_data").append(row(user));
    }else{
        console.log("Failed: " + response.status);
    }
}

// Изменение пользователя
async function editUser(userId, userName, userAge) {
    const response = await fetch("api/users", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify({
            id: userId,
            name: userName,
            age: userAge
        })
    });

    if(response.ok){
        const user = await response.json();
        reset();
        // TODO: Убрать jQuery
        $("tr[data-rowid='" + user.id + "']").replaceWith(row(user));
    }else{
        console.log("Failed: " + response.status);
    }
}

// Удаление пользователя
async function deleteUser(id) {
    const response = await fetch("api/users/"+id, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify({
            id: id
        })
    });

    if(response.ok){
        const user = await response.json();
        console.log(user);
        // TODO: Убрать jQuery
        $("tr[data-rowid='" + user.id + "']").remove();
    }else{
        console.log("Failed: " + response.status);
    }
}

// eslint-disable-next-line no-unused-vars
function usersMain(){
    // сброс значений формы
    document.querySelector("#reset").click(function (e) {
        // Не вызываем стандартные обработчики
        e.preventDefault();
        reset();
    });

    // отправка формы
    $("#edit_form").submit(function (e) {
        e.preventDefault();
        const id = Number(this.elements["id"].value);
        const name = this.elements["name"].value;
        const age = this.elements["age"].value;
        if (id === 0){
            сreateUser(name, age);
        }else{
            editUser(id, name, age);
        }
    });

    // Нажатие на ссылку Изменить
    $("body").on("click", ".editLink", function () {
        const id = $(this).data("id");
        getUser(id);
    });

    // Нажатие на ссылку Удалить
    $("body").on("click", ".removeLink", function () {
        const id = $(this).data("id");
        deleteUser(id);
    });

    // загрузка пользователей
    getUsers();
}