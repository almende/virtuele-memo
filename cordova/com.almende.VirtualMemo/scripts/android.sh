#!/bin/sh

help_msg="Usage: $0 {build|upload|log|login|all|uninstall|help}"

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

uninstall() {
	adb uninstall com.almende.VirtualMemo
}

log() {
	TAGNAME="CordovaLog"
	adb logcat -s "$TAGNAME"
}

login() {
	cd /home/anne/myscripts/devices/android && ./wots.sh
}

release() {
	cordova build android --release
	adb_install platforms/android/ant-build/VirtualMemo-release.apk
}

all() {
	build
	sleep 1
	upload
	sleep 2
	#login
	log
}

case "$cmd" in 
	build)
		build
		;;
	release)
		release
		;;
	upload)
		upload
		;;
	log)
		log
		;;
	login)
		login
		;;
	uninstall)
		uninstall
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
