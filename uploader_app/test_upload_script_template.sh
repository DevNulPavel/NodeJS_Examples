#! /usr/bin/env bash

export AMAZON_CLIENT_ID=""
export AMAZON_CLIENT_SECRET=""
export AMAZON_APP_ID=""
export APP_CENTER_ACCESS_TOKEN=""
export APP_CENTER_APP_NAME=""
export APP_CENTER_APP_OWNER_NAME=""
export GOOGLE_SERVICE_EMAIL=""
export GOOGLE_KEY_ID=""
export GOOGLE_KEY=""
export IOS_USER=""
export IOS_PASS=""
export SSH_SERVER=""
export SSH_USER=""
export SSH_PASS=""
export SSH_PRIVATE_KEY_PATH=""
export SLACK_API_TOKEN=""
export SLACK_CHANNEL=""

# GDrive
# node main.js \
#     --google_drive_files "/Users/devnul/Desktop/download.jpeg","/Users/devnul/Desktop/screenshot.png" \
#     --google_drive_target_folder_id "1ziMxgtRz9gzwm7NVEO--WxPXY5rcxpJY"

# SSH
# node main.js \
#     --ssh_upload_files "/Users/devnul/Desktop/download.jpeg","/Users/devnul/Desktop/screenshot.png" \
#     --ssh_target_server_dir "~/test_dir"

# Slack
# node main.js \
#     --slack_upload_files "/Users/devnul/Desktop/download.jpeg","/Users/devnul/Desktop/screenshot.png"

# All
# node main.js \
#     --google_drive_files "/Users/devnul/Desktop/download.jpeg","/Users/devnul/Desktop/screenshot.png" \
#     --google_drive_target_folder_id "1ziMxgtRz9gzwm7NVEO--WxPXY5rcxpJY" \
#     --ssh_upload_files "/Users/devnul/Desktop/download.jpeg","/Users/devnul/Desktop/screenshot.png" \
#     --ssh_target_server_dir "~/test_dir" \
#     --slack_upload_files "/Users/devnul/Desktop/logs.txt","/Users/devnul/Desktop/Island2.js"