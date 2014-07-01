var BLEHandler = function() {
	var self = this;
	var addressKey = 'address';
	var flowerUuid = '39e1fa00-84a8-11e2-afba-0002a5d5c51b';
	var memoUuid = '1802';
	var alertLevelServiceUuid = '1802';
	var alertLevelCharacteristicUuid = '2a06';

	var linkLossServiceUuid = '1803';
	var linkLossCharacteristicUuid = '2a06';

	var scanTimer = null;
	var connectTimer = null;
	var reconnectTimer = null;

	var iOSPlatform = "iOS";
	var androidPlatform = "Android";

	self.init = function() {
		bluetoothle.initialize(self.initSuccess, self.initError, {"request": true});
	}

	self.connectDevice = function(address) {
		console.log("Begining connection to: " + address + " with 5 second timeout");
		var paramsObj = {"address": address};
		bluetoothle.connect(self.connectSuccess, self.connectError, paramsObj);
		self.connectTimer = setTimeout(self.connectTimeout, 5000);
	}

	self.connectSuccess = function(obj) {
		if (obj.status == "connected") {
			console.log("Connected to : " + obj.name + " - " + obj.address);

			self.clearConnectTimeout();

			self.tempDisconnectDevice();
		}
		else if (obj.status == "connecting") {
			console.log("Connecting to : " + obj.name + " - " + obj.address);
		}
		else {
			console.log("Unexpected connect status: " + obj.status);
			self.clearConnectTimeout();
		}
	}

	self.connectError = function(obj) {
		console.log("Connect error: " + obj.error + " - " + obj.message);
		self.clearConnectTimeout();
	}

	self.connectTimeout = function() {
		console.log('Connection timed out, stop connection attempts');
	}

	self.clearConnectTimeout = function() { 
		console.log("Clearing connect timeout");
		if (self.connectTimer != null) {
			clearTimeout(self.connectTimer);
		}
	}


	self.tempDisconnectDevice = function() {
		console.log("Disconnecting from device to test reconnect");
		bluetoothle.disconnect(self.tempDisconnectSuccess, self.tempDisconnectError);
	}

	self.tempDisconnectSuccess = function(obj) {
		if (obj.status == "disconnected") {
			console.log("Temp disconnect device and reconnecting in 1 second. Instantly reconnecting can cause issues");
			setTimeout(self.reconnect, 1000);
		} else if (obj.status == "disconnecting") {
			console.log("Temp disconnecting device");
		} else {
			console.log("Unexpected temp disconnect status: " + obj.status);
		}
	}

	self.tempDisconnectError = function(obj) {
		console.log("Temp disconnect error: " + obj.error + " - " + obj.message);
	}

	self.reconnect = function() {
		console.log("Reconnecting with 5 second timeout");
		bluetoothle.reconnect(self.reconnectSuccess, self.reconnectError);
		self.reconnectTimer = setTimeout(self.reconnectTimeout, 5000);
	}

	self.reconnectSuccess = function(obj) {
		if (obj.status == "connected") {
			console.log("Reconnected to : " + obj.name + " - " + obj.address);

			self.clearReconnectTimeout();

			if (window.device.platform == iOSPlatform) {
				console.log("Discovering alert level service");
				var paramsObj = {"serviceUuids": [alertLevelServiceUuid] };
				bluetoothle.services(self.alertLevelSuccess, self.alertLevelError, paramsObj);
			} else if (window.device.platform == androidPlatform) {
				console.log("Beginning discovery");
				bluetoothle.discover(self.discoverSuccess, self.discoverError);
			}
		} else if (obj.status == "connecting") {
			console.log("Reconnecting to : " + obj.name + " - " + obj.address);
		} else {
			console.log("Unexpected reconnect status: " + obj.status);
			self.disconnectDevice();
		}
	}

	self.reconnectError = function(obj) {
		console.log("Reconnect error: " + obj.error + " - " + obj.message);
		disconnectDevice();
	}

	self.reconnectTimeout = function() {
		console.log("Reconnection timed out");
	}

	self.clearReconnectTimeout = function() { 
		console.log("Clearing reconnect timeout");
		if (self.reconnectTimer != null) {
			clearTimeout(self.reconnectTimer);
		}
	}

	self.startScanSuccess = function(obj) {
		if (obj.status == 'scanResult') {
			console.log('Stopping scan');
			bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
			self.clearScanTimeout();
			window.localStorage.setItem(addressKey, obj.address);
			self.connectDevice(obj.address);
		} else if (obj.status == 'scanStarted') {
			console.log('Scan was started successfully, stopping in 10 seconds');
			self.scanTimer = setTimeout(self.scanTimeout, 10000);
		} else {
			console.log('Unexpected start scan status: ' + obj.status);
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

	self.stopScanSuccess = function(obj) {
		if (obj.status == 'scanStopped') {
			console.log('Scan was stopped successfully');
		} else {
			console.log('Unexpected stop scan status: ' + obj.status);
		}
	}

	self.stopScanError = function(obj) {
		console.log('Stop scan error: ' + obj.error + ' - ' + obj.message);
	}

	self.startScanError = function(obj) {
		console.log('Scan error', obj.status);
		navigator.notification.alert(
				'Could not find a device using Bluetooth scanning.',
				null,
				'Status',
				'Sorry!');
	}

	self.initSuccess = function(obj) {
		console.log('Properly connected to BLE chip');
		console.log('Message', obj.status);
		if (obj.status == 'initialized') {
			var address = window.localStorage.getItem(self.addressKey);
			if (address == null) {
				console.log('No address known, so start scan');
				var paramsObj = { 'serviceUuids': [memoUuid]};
				bluetoothle.startScan(self.startScanSuccess, self.startScanError, paramsObj);
			} else {
				console.log('Address already known, so connect directly to ', address);
			}
		}
	}

	self.initError = function(obj) {
		console.log('Connection to BLE chip failed');
		console.log('Message', obj.status);
		navigator.notification.alert(
				'Bluetooth is not turned on, or could not be turned on. Make sure your phone has a Bluetooth 4.+ (BLE) chip.',
				null,
				'BLE off?',
				'Sorry!');
	}

	self.alertLevelSuccess = function(obj) {
		if (obj.status == "discoveredServices")
		{
			var serviceUuids = obj.serviceUuids;
			for (var i = 0; i < serviceUuids.length; i++) {
				var serviceUuid = serviceUuids[i];

				if (serviceUuid == self.alertLevelServiceUuid) {
					console.log("Finding alert level characteristics");
					var paramsObj = {"serviceUuid":alertLevelServiceUuid, "characteristicUuids":[alertLevelCharacteristicUuid]};
					bluetoothle.characteristics(self.characteristicsAlertLevelSuccess, self.characteristicsAlertLevelError, paramsObj);
					return;
				}
			}
			console.log("Error: alert level service not found");
		}
		else
		{
			console.log("Unexpected services alert level status: " + obj.status);
		}
		self.disconnectDevice();
	}

	self.alertLevelError = function(obj) {
		console.log("Services alert level error: " + obj.error + " - " + obj.message);
		self.disconnectDevice();
	}

	self.characteristicsAlertLevelSuccess = function(obj) {
		if (obj.status == "discoveredCharacteristics") {
			var characteristicUuids = obj.characteristicUuids;
			for (var i = 0; i < characteristicUuids.length; i++)
			{
				console.log("Alert level characteristics found, now discovering descriptor");
				var characteristicUuid = characteristicUuids[i];

				if (characteristicUuid == alertLevelCharacteristicUuid) {
					//self.writeAlertLevel();
					self.readLinkLoss();
					return;
					//var paramsObj = {"serviceUuid": self.alertLevelServiceUuid, "characteristicUuid": self.alertLevelCharacteristicUuid};
					//bluetoothle.descriptors(self.descriptorsAlertLevelSuccess, self.descriptorsAlertLevelError, paramsObj);
					//return;
				}
			}
			console.log("Error: Alert level characteristic not found.");
		}
		else
		{
			console.log("Unexpected characteristics alert level: " + obj.status);
		}
		self.disconnectDevice();
	}

	self.characteristicsAlertLevelError = function(obj)
	{
		console.log("Characteristics heart error: " + obj.error + " - " + obj.message);
		self.disconnectDevice();
	}

	// function only works on iOS, not on Android
	self.descriptorsAlertLevelSuccess = function(obj)
	{
		if (obj.status == "discoveredDescriptors")
		{
			console.log("Discovered alert level descriptor");
		}
		else
		{
			console.log("Unexpected alert level status: " + obj.status);
			self.disconnectDevice();
		}
	}

	// function only works on iOS, not on Android
	self.descriptorsAlertLevelError = function(obj)
	{
		console.log("Descriptors alert error: " + obj.error + " - " + obj.message);
		self.disconnectDevice();
	}

	self.discoverSuccess = function(obj)
	{
		if (obj.status == "discovered")
		{
			console.log("Discovery completed");

			self.writeAlertLevel();
		}
		else
		{
			console.log("Unexpected discover status: " + obj.status);
			self.disconnectDevice();
		}
	}

	self.discoverError = function(obj)
	{
		console.log("Discover error: " + obj.error + " - " + obj.message);
		self.disconnectDevice();
	}

	self.writeAlertLevel = function() {
		var u8 = new Uint8Array(1);
		u8[0] = 2;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write alert level " + v + " at service " + alertLevelServiceUuid + ' and characteristic ' + alertLevelCharacteristicUuid);
		var paramsObj = {"serviceUuid": alertLevelServiceUuid, "characteristicUuid": alertLevelCharacteristicUuid, "value": v };
		bluetoothle.write(self.writeAlertLevelSuccess, self.writeAlertLevelError, paramsObj);
	}
	
	self.writeAlertLevelSuccess = function(obj) {
		if (obj.status == 'written') {
			console.log('Successful written alert level', obj.status);
		} else {
			console.log('Writing was not successful', obj);
		}
	}

	self.writeAlertLevelError = function(obj) {
		console.log('Error in writing alert level', obj.status);
	}

	self.readLinkLoss = function() {
		console.log("Read link loss level at service " + alertLevelServiceUuid + ' and characteristic ' + alertLevelCharacteristicUuid);
		var paramsObj = {"serviceUuid": linkLossServiceUuid, "characteristicUuid": linkLossCharacteristicUuid};
		bluetoothle.read(self.readLinkLossSuccess, self.readLinkLossError, paramsObj);
	}

	self.readLinkLossSuccess = function(obj) {
		if (obj.status == "read")
		{
			console.log("Read status");
			self.writeAlertLevel();

			//var bytes = bluetoothle.encodedStringToBytes(obj.value);
			//console.log("Link loss: " + bytes[0]);

			/*
			console.log("Subscribing to heart rate for 5 seconds");
			var paramsObj = {"serviceUuid":heartRateServiceUuid, "characteristicUuid":heartRateMeasurementCharacteristicUuid};
			bluetoothle.subscribe(subscribeSuccess, subscribeError, paramsObj);
			setTimeout(unsubscribeDevice, 5000);
			*/
		}
		else
		{
			console.log("Unexpected read status: " + obj.status);
			self.disconnectDevice();
		}
	}

	self.readLinkLossError = function(obj) {
		console.log('Error in reading link loss level', obj.status);
		self.writeAlertLevel();
	}

	self.readBatteryLevel = function() {
		console.log("Reading battery level, not yet implemented");
		//var paramsObj = {"serviceUuid":batteryServiceUuid, "characteristicUuid":batteryLevelCharacteristicUuid};
		//bluetoothle.read(readSuccess, readError, paramsObj);
	}

	self.disconnectDevice = function() {
		bluetoothle.disconnect(self.disconnectSuccess, self.disconnectError);
	}

	self.disconnectSuccess = function(obj)
	{
		if (obj.status == "disconnected")
		{
			console.log("Disconnect device");
			self.closeDevice();
		}
		else if (obj.status == "disconnecting")
		{
			console.log("Disconnecting device");
		}
		else
		{
			console.log("Unexpected disconnect status: " + obj.status);
		}
	}

	self.disconnectError = function(obj)
	{
		console.log("Disconnect error: " + obj.error + " - " + obj.message);
	}

	self.closeDevice = function()
	{
		bluetoothle.close(self.closeSuccess, self.closeError);
	}

	self.closeSuccess = function(obj)
	{
		if (obj.status == "closed")
		{
			console.log("Closed device");
		}
		else
		{
			console.log("Unexpected close status: " + obj.status);
		}
	}

	self.closeError = function(obj)
	{
		console.log("Close error: " + obj.error + " - " + obj.message);
	}
}

