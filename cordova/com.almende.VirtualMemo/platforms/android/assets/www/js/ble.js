var BLEHandler = function() {
	var self = this;
	var addressKey = 'address';
	var flowerUuid = '39e1fa00-84a8-11e2-afba-0002a5d5c51b';
	var memoUuid = '1802';
	var scanTimer = null;

	self.init = function() {
		bluetoothle.initialize(self.initSuccess, self.initError, {"request": true});
	}

	self.startScanSuccess = function(msg) {
		if (msg.status == 'scanResult') {
			console.log('Stopping scan');
			bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
			self.clearScanTimeout();
			window.localStorage.setItem(addressKey, msg.address);
		} else if (msg.status == 'scanStarted') {
			console.log('Scan was started successfully, stopping in 10 seconds');
			self.scanTimer = setTimeout(self.scanTimeout, 10000);
		} else {
			console.log('Unexpected start scan status: ' + msg.status);
			console.log('Stopping scan');
			bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
			self.clearScanTimeout();
		}
	}


	self.clearScanTimeout = function() { 
		console.log('Clearing scanning timeout');
		if (self.scanTimer != null) 	{
			clearTimeout(self.scanTimer);
		}
	}

	self.scanTimeout = function() {
		console.log('Scanning timed out, stop scanning');
		bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
	}

	self.stopScanSuccess = function(msg) {
		if (msg.status == 'scanStopped') {
			console.log('Scan was stopped successfully');
		} else {
			console.log('Unexpected stop scan status: ' + msg.status);
		}
	}

	self.stopScanError = function(msg) {
		console.log('Stop scan error: ' + msg.error + ' - ' + msg.message);
	}

	self.startScanError = function(msg) {
		console.log('Scan error', msg.status);
		navigator.notification.alert(
				'Could not find a device using Bluetooth scanning.',
				null,
				'Status',
				'Sorry!');
	}

	self.initSuccess = function(msg) {
		console.log('Properly connected to BLE chip');
		console.log('Message', msg.status);
		if (msg.status == 'initialized') {
			var address = window.localStorage.getItem(self.addressKey);
			if (address == null) {
				console.log('No address known, so start scan');
				var paramsObj = { 'serviceUuids': [self.memoUuid]};
				bluetoothle.startScan(self.startScanSuccess, self.startScanError, paramsObj);
			} else {
				console.log('Address already known, so connect directly to ', address);
			}
		}
	}

	self.initError = function(msg) {
		console.log('Connection to BLE chip failed');
		console.log('Message', msg.status);
		navigator.notification.alert(
				'Bluetooth is not turned on, or could not be turned on. Make sure your phone has a Bluetooth 4.+ (BLE) chip.',
				null,
				'BLE off?',
				'Sorry!');
	}

}

