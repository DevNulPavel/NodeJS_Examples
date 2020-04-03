"use strict";

const commander = require("commander");
const slack_uploader = require("./src/slack_uploader");


////////////////////////////////////////////////////////////////////////////////////////////////////

async function sendTextToSlackUser(slackApiToken, slackUser, slackUserEmail, slackUserText, slackUserQRTextCommentary, slackUserQrText) {
    await slack_uploader.sendTextToSlackUser(slackApiToken, slackUser, slackUserEmail, slackUserText, slackUserQRTextCommentary, slackUserQrText);
}

async function sendTextToSlackChannel(slackApiToken, slackChannelText, slackChannelQRTextCommentary, slackChannelQRText) {
    await slack_uploader.sendTextToSlackChannel(slackApiToken, slackChannelText, slackChannelQRTextCommentary, slackChannelQRText);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

async function main() {
    // Пробуем получить из переменных окружения данные для авторизации
    const slackApiToken = process.env["SLACK_API_TOKEN"];

    // Парсим аргументы коммандной строки, https://github.com/tj/commander.js
    commander.option("--slack_channel <channel>", "Slack channel");
    commander.option("--slack_channel_text <text>", "Slack channel text");
    commander.option("--slack_channel_qr_commentary <text>", "Slack channel QR commentary");
    commander.option("--slack_channel_qr_text <text>", "Slack channel QR code content");
    commander.option("--slack_user <user>", "Slack user name for direct messages");
    commander.option("--slack_user_email <user_email>", "Slack user email for direct messages");
    commander.option("--slack_user_text <text>", "Slack direct message text");
    commander.option("--slack_user_qr_commentary <text>", "Slack direct QR code commentary");
    commander.option("--slack_user_qr_text <text>", "Slack direct QR code content");
    commander.parse(process.argv);

    const slackChannel = commander.slack_channel;
    const slackChannelText = commander.slack_channel_text;
    const slackChannelQRTextCommentary = commander.slack_channel_qr_commentary;
    const slackChannelQRText = commander.slack_channel_qr_text;
    const slackUser = commander.slack_user;
    const slackUserEmail = commander.slack_user_email;
    const slackUserText = commander.slack_user_text;
    const slackUserQRTextCommentary = commander.slack_user_qr_commentary;
    const slackUserQRText = commander.slack_user_qr_text;

    // Slack direct
    if (slackUser || slackUserEmail) {
        await sendTextToSlackUser(slackApiToken, slackUser, slackUserEmail, slackUserText, slackUserQRTextCommentary, slackUserQRText);
    }
    if(slackChannel){
        await sendTextToSlackChannel(slackApiToken, slackChannel, slackChannelText, slackChannelQRTextCommentary, slackChannelQRText);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

main();
