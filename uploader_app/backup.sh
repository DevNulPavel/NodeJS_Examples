#! /usr/bin/env bash

mkdir -p backup/
rm backup/*
zip -er backup/test_keys.zip ./test_keys/ test_upload_script.sh