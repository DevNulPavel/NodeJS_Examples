"use strict";

const commander = require("commander");
const slack_uploader = require("./src/slack_uploader");


////////////////////////////////////////////////////////////////////////////////////////////////////

async function sendTextToSlackUser(slackApiToken, slackUser, slackUserEmail, slackUserText, slackUserQRTextCommentary, slackUserQrText) {
    await slack_uploader.sendTextToSlackUser(slackApiToken, slackUser, slackUserEmail, slackUserText, slackUserQRTextCommentary, slackUserQrText);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

async function main() {
    // Пробуем получить из переменных окружения данные для авторизации
    const slackApiToken = process.env["SLACK_API_TOKEN"];

    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    commander.option("--slack_user <user>", "Slack user name for direct messages");
    commander.option("--slack_user_email <user_email>", "Slack user email for direct messages");
    commander.option("--slack_user_text <text>", "Slack direct message text");
    commander.option("--slack_user_qr_commentary <text>", "Slack direct QR code commentary");
    commander.option("--slack_user_qr_text <text>", "Slack direct QR code content");
    commander.parse(process.argv);

    const slackUser = commander.slack_user;
    const slackUserEmail = commander.slack_user_email;
    const slackUserText = commander.slack_user_text;
    const slackUserQRTextCommentary = commander.slack_user_qr_commentary;
    const slackUserQRText = commander.slack_user_qr_text;

    // Slack direct
    if (slackUser || slackUserEmail) {
        await sendTextToSlackUser(slackApiToken, slackUser, slackUserEmail, slackUserText, slackUserQRTextCommentary, slackUserQRText);
    }else{
        throw Error("User name or user email is missing");
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

main();
