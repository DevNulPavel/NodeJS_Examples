#! /usr/bin/env bash

export AMAZON_CLIENT_ID=""
export AMAZON_CLIENT_SECRET=""
export AMAZON_APP_ID=""
export APP_CENTER_ACCESS_TOKEN=""
export APP_CENTER_APP_NAME=""
export APP_CENTER_APP_OWNER_NAME=""
export GOOGLE_DRIVE_SERVICE_EMAIL=""
export GOOGLE_DRIVE_KEY_ID=""
export GOOGLE_DRIVE_KEY=""
export GOOGLE_PLAY_SERVICE_EMAIL=""
export GOOGLE_PLAY_KEY_ID=""
export GOOGLE_PLAY_KEY=""
export IOS_USER=""
export IOS_PASS=""
export SSH_SERVER=""
export SSH_USER=""
export SSH_PASS=""
export SSH_PRIVATE_KEY_PATH=""
export SLACK_API_TOKEN=""
export SLACK_CHANNEL=""
export SLACK_TEXT_PREFIX=""
export SLACK_USER=""
export SLACK_EMAIL=""

# Amazon
# node build/app/main.js \
#     --amazon_input_file "Island2-arm32-amazon-11.15.0-314-12112019_1749-821dc9f0.apk"

# GDrive
# node build/app/main.js \
#     --google_drive_files "/Users/devnul/Desktop/logs.txt","/Users/devnul/Desktop/screenshot.png" \
#     --google_drive_target_folder_id "1ziMxgtRz9gzwm7NVEO--WxPXY5rcxpJY" \
#     --google_drive_target_owner_email "veselov@game-insight.com" \
#     --google_drive_target_domain "game-insight.com"

# SSH
# node build/app/main.js \
#     --ssh_upload_files "/Users/devnul/Desktop/download.jpeg","/Users/devnul/Desktop/screenshot.png" \
#     --ssh_target_server_dir "~/test_dir"

# Slack
# node build/app/main.js \
#     --slack_upload_files "/Users/devnul/Desktop/download.jpeg","/Users/devnul/Desktop/screenshot.png"

# App center
# node build/app/main.js \
#     --app_center_input_file "/Users/devnul/Downloads/Island2-11.15.0_314-AppStore-20191112_164601-821dc9f.ipa" \
#     --app_center_distribution_groups "17-Bullets","All-users-of-Mystery-Manor-xGen-iOS-PK","Collaborators","Gi-All-Limited","Gi-QA"

# Google play
# node build/app/main.js \
#     --google_play_upload_file "" \
#     --google_play_target_track "internal" \
#     --google_play_package_name "com.gameinsight.gplay.island2"

# All
# node build/app/main.js \
#     --amazon_input_file "Island2-arm32-amazon-11.15.0-314-12112019_1749-821dc9f0.apk" \
#     --google_drive_files "/Users/devnul/Desktop/download.jpeg","/Users/devnul/Downloads/Island2-11.15.0_314-AppStore-20191112_164601-821dc9f.ipa" \
#     --google_drive_target_folder_id "1ziMxgtRz9gzwm7NVEO--WxPXY5rcxpJY" \
#     --google_drive_target_owner_email "devnulpavel@gmail.com" \
#     --ssh_upload_files "/Users/devnul/Desktop/download.jpeg","/Users/devnul/Desktop/screenshot.png" \
#     --ssh_target_server_dir "~/test_dir" \
#     --app_center_input_file "/Users/devnul/Downloads/Island2-11.15.0_314-AppStore-20191112_164601-821dc9f.ipa" \
#     --slack_upload_files "/Users/devnul/Desktop/logs.txt","/Users/devnul/Desktop/Island2.js"