#! /usr/bin/env bash

mkdir -p backup/
rm backup/*
zip -er backup/test_keys.zip ./test_keys/
zip -er backup/test_upload_script.zip test_upload_script.sh