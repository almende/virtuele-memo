#!/bin/sh

cmd=${1:? "$0 requires \"cmd\" as first argument"}

build() {
	cd .. && cordova build android
}

upload() {
	adb uninstall com.almende.VirtualMemo
	adb install ../platforms/android/ant-build/VirtualMemo-debug.apk
	adb shell am start -n com.almende.VirtualMemo/.VirtualMemo
}

case "$cmd" in 
	build)
		build
		;;
	upload)
		upload
		;;
	*)
		echo $"Usage: $0 {build|upload}"
		exit 1
esac
