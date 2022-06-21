#!/usr/bin/env bash
./node_modules/.bin/c-preprocessor --config c-preprocessor-config.json TemplateForTest.sol ExoTokenUpgradeTest.sol
./node_modules/.bin/c-preprocessor --config c-preprocessor-config.json TemplateForDeploy.sol ExoTokenUpgrade.sol
rm -rf `pwd`/contracts/ExoTokenUpgradeTest.sol
rm -rf `pwd`/contracts/ExoTokenUpgrade.sol
mv ExoTokenUpgradeTest.sol `pwd`/contracts
mv ExoTokenUpgrade.sol `pwd`/contracts
rm -rf `pwd`/build/contracts/ExoTokenUpgradeTest.json
rm -rf `pwd`/build/contracts/ExoTokenUpgrade.json
./node_modules/.bin/truffle compile 
