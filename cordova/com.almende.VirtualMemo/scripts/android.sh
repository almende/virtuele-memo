#!/bin/sh

cmd=${1:? "$0 requires \"cmd\" as first argument"}

path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
working_path=$path/..

# working path, should be parent directory of script directory
cd $working_path

build() {
	cordova build android
}

upload() {
	adb uninstall com.almende.VirtualMemo
	adb install platforms/android/ant-build/VirtualMemo-debug.apk
	adb shell am start -n com.almende.VirtualMemo/.VirtualMemo
}

log() {
	adb logcat
}

all() {
	build
	sleep 1
	upload
	sleep 1
	log
}

case "$cmd" in 
	build)
		build
		;;
	upload)
		upload
		;;
	log)
		log
		;;
	all)
		all
		;;
	*)
		echo $"Usage: $0 {build|upload|log}"
		exit 1
esac
