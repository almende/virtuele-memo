#!/bin/sh

help_msg="Usage: $0 {build|upload|log}"

help() {
	echo $help_msg
	exit 1
}

cmd=${1:-help}

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
	help)
		help
		;;
	*)
		echo "huh"
esac
