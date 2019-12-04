"use strict";

const status = document.getElementById("status");
const messages = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");


function setStatus(value) {
    status.innerHTML = value;
}

function printMessage(value) {
    const li = document.createElement("li");
    li.innerHTML = value;
    messages.appendChild(li);
}

function main(){
    const ws = new WebSocket("ws://localhost:8888");
    
    ws.onopen = () => {
        setStatus("ONLINE");
    };
    ws.onclose = () => {
        setStatus("DISCONNECTED");
    };
    ws.onmessage = (response) => {
        printMessage(response.data);
    };
    ws.onerror = (err)=>{
        console.log(err);
    };

    form.addEventListener("submit", (event)=>{
        event.preventDefault();
        ws.send(input.value);
        input.value = "";
    });
}


main();