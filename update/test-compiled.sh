#!/usr/bin/env bash
./node_modules/.bin/c-preprocessor --config c-preprocessor-config.json TestTemplate.js ExoTokenUpgrade.js
./node_modules/.bin/ganache-cli --port 4545 &
mv token-saver.js `pwd`/test
./node_modules/.bin/truffle test
lsof -i :4545 -sTCP:LISTEN |awk 'NR > 1 {print $2}'  |xargs kill -15
