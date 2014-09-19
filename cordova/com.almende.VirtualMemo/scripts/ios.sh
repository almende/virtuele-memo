#!/bin/sh
cd ..
sudo npm install -g ios-sim

cordova platform remove ios

#remove all plugins used
cordova plugin remove org.apache.cordova.console
cordova plugin remove https://github.com/randdusing/BluetoothLE.git
cordova plugin remove org.apache.cordova.device
cordova plugin remove https://git-wip-us.apache.org/repos/asf/cordova-plugin-dialogs.git
cordova plugin remove https://github.com/mobilion/cordova-ibeacon-plugin.git
cordova plugin remove de.appplant.cordova.plugin.local-notification


cordova platform add ios

#add plugins
cordova plugin add org.apache.cordova.console
cordova plugin add https://github.com/randdusing/BluetoothLE.git
cp ./scripts/BluetoothLePlugin.m ./plugins/com.randdusing.bluetoothle/src/ios
cp ./scripts/BluetoothLePlugin.m ./platforms/ios/VirtualMemo/Plugins/com.randdusing.bluetoothle
cordova plugin add org.apache.cordova.device
cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-dialogs.git
cordova plugin add https://github.com/mobilion/cordova-ibeacon-plugin.git
cordova plugin add de.appplant.cordova.plugin.local-notification

cordova platform update ios
cordova build ios
cordova run ios