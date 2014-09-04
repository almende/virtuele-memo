#!/bin/sh
cd ..
sudo npm install -g ios-sim
cordova platform remove ios
cordova platform add ios
cordova plugin add org.apache.cordova.console
cordova plugin add https://github.com/randdusing/BluetoothLE.git
cordova plugin add org.apache.cordova.device
cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-dialogs.git
#cordova plugin add https://github.com/Attendease/iBeaconsPlugin.git
#cordova plugin add https://github.com/petermetz/cordova-plugin-ibeacon.git
cordova plugin add https://github.com/mobilion/cordova-ibeacon-plugin.git
cordova plugin add de.appplant.cordova.plugin.local-notification
cordova platform update ios
cordova build ios
cordova run ios