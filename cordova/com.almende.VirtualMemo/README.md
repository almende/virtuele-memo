# Cordova

The code that is cross-platform, is developed through Cordova.

## Android

Commands can be found on the [project site](https://cordova.apache.org/docs/en/3.4.0/guide_platforms_ubuntu_index.md.html).

To build the project:

    cordova build android

To run the application in the emulator:

    cordova run android

The application is not necessarily automatically started, so after the emulator starts, navigate to applications, and click on the icon with the text "Virtuele Memo".

To run the application:

    cordova run android --device

If there are no devices found, make sure you have connected the device to your laptop and check if it is recognized by the operating system.

    $> lsusb
    Bus 003 Device 010: ID 18d1:d002 Google Inc. 

Turn on debugging on the phone, on an Android this is five times clicking on settings, or something silly like that.

    adb devices

This list all devices, the following happens if your permissions are incorrect:

    $> adb devices
    List of devices attached 
    emulator-5554	device
    ????????????	no permissions

Make sure in that case that you have a udev rule with the group "plugdev":

    $> cat /etc/udev/rules.d/50-android.rules 
    SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev"
    sudo udevadm control --reload-rules
    sudo service udev restart

And make sure adb is in the right group.

    sudo chown root.plugdev $(which adb)

Now, you will see your devices on `adb devices` and you can try again the `cordova run android --device` command. This is worth it, because an actual phone runs much faster than the emulator.

This fails again on my system, with some weird error:

```
Generating config.xml from defaults for platform "android"
Running app on platform "android" via command "$HOME/myworkspace/virtuele-memo/ios/cordova-style/com.almende.VirtualMemo/platforms/android/cordova/run" --device
Error: An error occurred while running the android project.
$HOME/myworkspace/virtuele-memo/ios/cordova-style/com.almende.VirtualMemo/platforms/android/cordova/node_modules/q/q.js:126
                    throw e;
                          ^
ERROR: Failed to launch application on device: ERROR: Failed to install apk to device: Error: Unknown encoding
```

However, I can't be bothered much, because it is easy to install it manually:

    adb install platforms/android/ant-build/VirtualMemo-debug.apk

Get the name of the activity to launch:

    $> aapt dump badging platforms/android/ant-build/VirtualMemo-debug.apk | grep activity
    launchable-activity: name='com.almende.VirtualMemo.VirtualMemo'  label='VirtualMemo' icon=''

And run it:

    adb shell am start -n com.almende.VirtualMemo/.VirtualMemo

And to get rid of it:

    $> adb uninstall com.almende.VirtualMemo
    Success

## BluetoothLE

To support Bluetooth LE, we used a plugin:

    cordova plugin add https://github.com/randdusing/BluetoothLE.git

To know on which type of device we or working, we use another plugin:

    cordova plugin add org.apache.cordova.device

Notifications are added as plugin as well:

    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-dialogs.git

This should automatically adjust your platform-specific configuration files as specified on [cordova.apache.org](https://cordova.apache.org/docs/en/3.0.0/cordova_notification_notification.md.html).

## Understanding the code

To get acquainted with jQuery Mobile, work your way through the [demos](http://demos.jquerymobile.com/1.0.1/docs/about/getting-started.html). Icons for example come only in a set of around 20. If you need additional icons, you have to add custom ones through adjusting a stylesheet and set a file [as background image](http://demos.jquerymobile.com/1.0.1/docs/buttons/buttons-icons.html).



