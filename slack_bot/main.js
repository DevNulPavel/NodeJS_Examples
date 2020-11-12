const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');
const process = require("process");
const util = require("util");

// https://api.slack.com/rtm
// https://slack.dev/node-slack-sdk/rtm-api
// https://api.slack.com/dialogs
// https://api.slack.com/interactivity/slash-commands
// https://api.slack.com/interactivity/handling#responses

function errorHandler(message){
    console.error(message);
}

async function onReady(client){
    // Sending a message requires a channel ID, a DM ID, an MPDM ID, or a group ID
    // The following value is used as an example
    // const conversationId = 'C1232456';

    // The RTM client can send simple string messages
    // const res = await client.sendMessage('Hello there', conversationId);

    // `res` contains information about the sent message
    // console.log('Message sent: ', res.ts);
}

async function onUserTyping(client, event){
    console.log("Typing: " + event);
}

async function onMessage(client, event){
    console.log("Message: " + JSON.stringify(event) + " " + client);
}

async function onUserDirectMessage(client, event){
}

async function main(){
    // Получаем токен для работы из слака
    const token = process.env.SLACK_API_TOKEN;

    // Если нету токена, выходим
    if(!token){
        throw Error("Slack token is missing");
    }

    console.log(token);

    // Создаем клиента для работы, назначаем обработчики
    const client = new RTMClient(token);

    // Назначаем обработчик вызовов из https://api.slack.com/events
    // Вызовется когда соединение будет установлено
    client.on("ready", onReady.bind(client));

    // Назначаем обработчик начала ввода символов
    client.on("user_typing", onUserTyping.bind(client));

    // Назначаем обработчик начала ввода символов
    client.on("message", async (event) => {
        if (event.type === "message"){
            const channel = event.channel;
            const user = event.user;

            /*const webClient = new WebClient(token);
            const dialogueParameters = {
                "trigger_id": "",
                "dialogue": ""
            };
            const res = await webClient.dialog.open(dialogueParameters);*/

            const res = await client.sendMessage("OK", channel);

            console.log("Message: " + JSON.stringify(event) + " " + client);
        }
        console.log("Message: " + JSON.stringify(event) + " " + client);
    });

    // Назначаем обработчик начала ввода символов
    client.on("message", async (event) => {
        if (event.type === "message"){
            const channel = event.channel;
            const user = event.user;

            const webClient = new WebClient(token);
            const dialogueParameters = {
                "trigger_id": "",
                "dialogue": ""
            };
            const res = await webClient.dialog.open(dialogueParameters);

            const res = await client.sendMessage("OK", channel);

            console.log("Message: " + JSON.stringify(event) + " " + client);
        }
        console.log("Message: " + JSON.stringify(event) + " " + client);
    });

    // Назначаем обработчик начала ввода символов
    client.on("message.im", onUserDirectMessage.bind(client));

    // Стартуем
    client.start()
        .catch(errorHandler);
}

main();