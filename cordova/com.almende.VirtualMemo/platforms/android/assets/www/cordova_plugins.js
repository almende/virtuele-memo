cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.randdusing.bluetoothle/www/bluetoothle.js",
        "id": "com.randdusing.bluetoothle.BluetoothLe",
        "clobbers": [
            "window.bluetoothle"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.device/www/device.js",
        "id": "org.apache.cordova.device.device",
        "clobbers": [
            "device"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.dialogs/www/notification.js",
        "id": "org.apache.cordova.dialogs.notification",
        "merges": [
            "navigator.notification"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.dialogs/www/android/notification.js",
        "id": "org.apache.cordova.dialogs.notification_android",
        "merges": [
            "navigator.notification"
        ]
    },
    {
        "file": "plugins/com.attendease.ibeacons/www/AttendeaseBeacons.js",
        "id": "com.attendease.ibeacons.AttendeaseBeacons",
        "clobbers": [
            "AttendeaseBeacons"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.randdusing.bluetoothle": "1.0.0",
    "org.apache.cordova.device": "0.2.11",
    "org.apache.cordova.dialogs": "0.2.9-dev",
    "org.apache.cordova.console": "0.2.10",
    "com.attendease.ibeacons": "0.4.2"
}
// BOTTOM OF METADATA
});