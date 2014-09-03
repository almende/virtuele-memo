cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/org.apache.cordova.device/www/device.js",
        "id": "org.apache.cordova.device.device",
        "clobbers": [
            "device"
        ]
    },
    {
        "file": "plugins/com.randdusing.bluetoothle/www/bluetoothle.js",
        "id": "com.randdusing.bluetoothle.BluetoothLe",
        "clobbers": [
            "window.bluetoothle"
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
        "file": "plugins/org.apache.cordova.console/www/console-via-logger.js",
        "id": "org.apache.cordova.console.console",
        "clobbers": [
            "console"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.console/www/logger.js",
        "id": "org.apache.cordova.console.logger",
        "clobbers": [
            "cordova.logger"
        ]
    },
    {
        "file": "plugins/de.appplant.cordova.plugin.local-notification/www/local-notification.js",
        "id": "de.appplant.cordova.plugin.local-notification.LocalNotification",
        "clobbers": [
            "plugin.notification.local"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.ibeacon/www/lib/underscore-min-1.6.js",
        "id": "org.apache.cordova.ibeacon.underscorejs",
        "runs": true
    },
    {
        "file": "plugins/org.apache.cordova.ibeacon/www/lib/klass.min.js",
        "id": "org.apache.cordova.ibeacon.klass"
    },
    {
        "file": "plugins/org.apache.cordova.ibeacon/www/lib/q.min.js",
        "id": "org.apache.cordova.ibeacon.Q",
        "runs": true
    },
    {
        "file": "plugins/org.apache.cordova.ibeacon/www/LocationManager.js",
        "id": "org.apache.cordova.ibeacon.LocationManager",
        "clobbers": [
            "cordova.plugins"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.ibeacon/www/Delegate.js",
        "id": "org.apache.cordova.ibeacon.Delegate",
        "runs": true
    },
    {
        "file": "plugins/org.apache.cordova.ibeacon/www/model/Region.js",
        "id": "org.apache.cordova.ibeacon.Region",
        "runs": true
    },
    {
        "file": "plugins/org.apache.cordova.ibeacon/www/Regions.js",
        "id": "org.apache.cordova.ibeacon.Regions",
        "runs": true
    },
    {
        "file": "plugins/org.apache.cordova.ibeacon/www/model/CircularRegion.js",
        "id": "org.apache.cordova.ibeacon.CircularRegion",
        "runs": true
    },
    {
        "file": "plugins/org.apache.cordova.ibeacon/www/model/BeaconRegion.js",
        "id": "org.apache.cordova.ibeacon.BeaconRegion",
        "runs": true
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "org.apache.cordova.device": "0.2.11",
    "com.randdusing.bluetoothle": "1.0.0",
    "org.apache.cordova.dialogs": "0.2.9-dev",
    "org.apache.cordova.console": "0.2.10",
    "de.appplant.cordova.plugin.local-notification": "0.7.4",
    "org.apache.cordova.ibeacon": "2.1.0"
}
// BOTTOM OF METADATA
});