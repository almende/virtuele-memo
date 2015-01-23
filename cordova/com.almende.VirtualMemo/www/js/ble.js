var BLEHandler = function() {
	var self = this;
	var addressKey = 'address';
	var flowerUuid = '39e1fa00-84a8-11e2-afba-0002a5d5c51b';
	var memoAddress = 'FE:F0:7F:FB:F4:CC';

	// there is no specific memoServiceUuid, so we pick the alert level one
	var memoUuid = '1802';
	var alertLevelServiceUuid = '1802';
	var alertLevelCharacteristicUuid = '2a06';

	var linkLossServiceUuid = '1803';
	var linkLossCharacteristicUuid = '2a06';

	var deviceInformationServiceUuid = '180a';
	var serialNumberCharacteristicUuid = '2a25';
	var scanTimer = null;
	var connectTimer = null;
	var reconnectTimer = null;

	var iOSPlatform = "iOS";
	var androidPlatform = "Android";

	var memoBug0 = false;
	var memoBug0_exec = false;
	var memoBug0_callback = null;
	var memoBug0_cargs = null;
	var discover_all = false;

	var defaultAlertLevel = "middle";

    var connected = true;
    var hasDevice = null;
    var backgroundMode = false;


    var devices = {};

	/**
	 * Initialization tries to connect to the BLE chip on the phone. If successful, a scan is started. If there is
	 * an "address" stored at local memory, we will use that to scan. If the scan is successful we connect to the
	 * device.
	 */
	self.init = function() {
		console.log('Try to connect to BLE chip (will ask to turn on Bluetooth to the user)');
		bluetoothle.initialize(self.initSuccess, self.initError, {"request": true});
	}

	self.setDefaultAlertLevel = function(level) {
		defaultAlertLevel = level;
	}

    self.doBackGroundScan = function() {
        backgroundMode = true;
        if (window.device.platform == iOSPlatform) {
            // iOS implements an OR operation, either of the Uuids found is okay
            paramsObj = { 'serviceUuids': [memoUuid, deviceInformationServiceUuid] };
        } else if (window.device.platform == androidPlatform) {
            // Android has an AND operation, deviceInformationServiceUuid does not seem to
            // be advertised, so this fails on Android
            paramsObj = { 'serviceUuids': [memoUuid] };
        }
        bluetoothle.startScan(self.startScanSuccess, self.startScanError, paramsObj);
    }

	self.connectDevice = function(address) {
		console.log("Connect to " + address + " with 5 second timeout");
		var paramsObj = {"address": address};
		bluetoothle.connect(self.connectSuccess, self.connectError, paramsObj);
		self.connectTimer = setTimeout(self.connectTimeout, 5000);
	}

	self.connectSuccess = function(obj) {
		if (obj.status == "connected") {
            self.connected = true;
            console.log("Connected to : " + obj.name + " - " + obj.address);
			//console.log("Write address " + obj.address + " to local storage");
			//window.localStorage.setItem(addressKey,obj.address);
			self.clearConnectTimeout();
			if (window.device.platform == iOSPlatform) {
				console.log("Discovering alert level and device information service");
				var paramsObj = {"serviceUuids": [deviceInformationServiceUuid] };
				//var paramsObj = {"serviceUuids": [alertLevelServiceUuid] };
				bluetoothle.services(self.deviceInfoSuccess, self.alertLevelError, paramsObj);
			} else if (window.device.platform == androidPlatform) {
				console.log("Beginning discovery");
				bluetoothle.discover(self.discoverSuccess, self.discoverError);
			}
		} else if (obj.status == "connecting") {
			console.log("Found BLE device:"+JSON.stringify(obj));
			console.log("Connecting to : " + obj.name + " - " + obj.address);
		} else {
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

	self.isConnected = function(callback) {
		bluetoothle.isConnected(callback);
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
        self.reconnect();
	}

	self.reconnect = function() {
        if (self.connected) {
            console.log("Reconnecting with 5 second timeout");
            bluetoothle.reconnect(self.reconnectSuccess, self.reconnectError);
            self.reconnectTimer = setTimeout(self.reconnectTimeout, 5000);
        }
	}

	self.reconnectSuccess = function(obj) {
		if (obj.status == "connected") {
			console.log("Reconnected to : " + obj.name + " - " + obj.address);

			self.clearReconnectTimeout();

			if (window.device.platform == iOSPlatform) {
				console.log("Discovering alert level service");
				var paramsObj = {"serviceUuids": [deviceInformationServiceUuid] };
				bluetoothle.services(self.deviceInfoSuccess, self.alertLevelError, paramsObj);
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
		if (bluetoothle.isConnected(function(){self.disconnectDevice();}));
	}

	self.reconnectTimeout = function() {
		console.log("Reconnection timed out");
        if (window.device.platform == iOSPlatform) {
            // iOS implements an OR operation, either of the Uuids found is okay
            paramsObj = { 'serviceUuids': [memoUuid, deviceInformationServiceUuid] };
        } else if (window.device.platform == androidPlatform) {
            // Android has an AND operation, deviceInformationServiceUuid does not seem to
            // be advertised, so this fails on Android
            paramsObj = { 'serviceUuids': [memoUuid] };
        }
        bluetoothle.startScan(self.startScanSuccess, self.startScanError, paramsObj);
    }

	self.clearReconnectTimeout = function() {
		console.log("Clearing reconnect timeout");
		if (self.reconnectTimer != null) {
			clearTimeout(self.reconnectTimer);
		}
	}

	/**
	 * If scan is successful, connect automatically to the discovered device.
	 */
	self.startScanSuccess = function(obj) {
		if (obj.status == 'scanResult') {
			console.log('Yes, we are successful and found a device in our scan');
			if (discover_all) {
				console.log("Found device: " + obj.address);
				//devices[devices.length] = obj;
				devices[obj.address] = obj;
			} else {
				bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
				self.clearScanTimeout();
                LocalDB.getDeviceUUIDbyDeviceId(obj.address, function(errcode, result, cargs) {
                   if (errcode == 0 && result) {
                       console.log("Found mapping: "+JSON.stringify(result));
                       self.hasDevice = obj.address;
                       window.localStorage.setItem(addressKey,result.uuid);
                       self.connectDevice(obj.address);
                   } else if (self.hasDevice == null) { //if (errcode == 0) {
                       console.log("No mapping found connecting to device with address: "+obj.address);
                       self.hasDevice = obj.address;
                       self.connectDevice(obj.address);
                   }
                });
			}
		} else if (obj.status == 'scanStarted') {
			//console.log('Scan was started successfully, stopping in 10 seconds');
            if (!backgroundMode)
			    self.scanTimer = setTimeout(self.scanTimeout, 10000);
		} else {
			console.log('Unexpected start scan status: ' + obj.status);
			console.log('Stopping scan');
			bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
			self.clearScanTimeout();
		}
	}

	/**
	 * Discover all devices. This means that stopScan should not be called after the first successful find of a 
	 * device, but we should continue finding all devices.
	 */
	self.discoverAll = function(enable) {
		console.log("Set discovery to: " + enable);
		discover_all = enable;
		if (discover_all) {
			// reinitialize
			self.init();
		}
		/*
		   bluetoothle.isScanning(function(obj) {
		   if (obj.isScanning) {
		   bluetoothle.stopScan(..,..);
		   } else {

		   }
		   });
		   */
	}

	self.getAllDevices = function() {
		return devices;
	}

	self.setAddress = function(address, callback, alertLevel) {
		console.log("Set address to: " +  address);
		window.localStorage.removeItem(addressKey);
		var closed = function(disconnectResult) {
			console.log("Closed connection");
			bluetoothle.initialize(
					function(result) {
						console.log("Initialized connection");
						if (result.status == "initialized") {
							self.connectDevice(address);
							callback();
						}
					},
					console.log
					);
		};
		var disconnected = function() {
			console.log("Disconnected connection");
			bluetoothle.close(closed,closed);
		};
		this.setDefaultAlertLevel(alertLevel);
		bluetoothle.disconnect(disconnected,disconnected);
	}

	self.getAddress = function() {
		var address = window.localStorage.getItem(addressKey);
		//if (address) {
		//	console.log("Obtained address: " + address);
		//}
		return address;
	}

	//    self.getSerialNumberCharacteristicUuid = function(){
	//        var uuid = window.localStorage.getItem(serialNumberCharacteristicUuid);
	//        if (uuid) {
	//            console.log("Obtained uuid: " + address);
	//        }
	//        return uuid;
	//    }

	self.clearScanTimeout = function() {
		console.log('Clearing scanning timeout');
		if (self.scanTimer != null) 	{
			clearTimeout(self.scanTimer);
		}
	}

	self.scanTimeout = function() {
		//console.log('Scanning timed out, stop scanning');
		bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
	}

	self.stopScanSuccess = function(obj) {
		if (obj.status == 'scanStopped') {
			//console.log('Scan was stopped successfully');
		} else {
			console.log('Unexpected stop scan status: ' + obj.status);
		}
	}

	self.stopScanError = function(obj) {
		console.log('Stop scan error: ' + obj.error + ' - ' + obj.message);
	}

	self.startScanError = function(obj) {
		if (obj.status) {
			console.log('Scan error: ' + JSON.stringify(obj.status));
		} else {
			console.log('Undefined scan error');
		}
		/*		navigator.notification.alert(
				'Could not find a device using Bluetooth scanning.',
				null,
				'Status',
				'Sorry!');
				*/
	}

	self.initSuccess = function(obj) {
		console.log('Properly connected to BLE chip, status: ' + JSON.stringify(obj.status));
		if (obj.status == 'initialized') {
			var address = window.localStorage.getItem(addressKey);
			if (!address || discover_all) {
				if (!address) {
					console.log('No address known, so start scan');
				} else {
					console.log("Start scan because of discover all flag");
				}
				var paramsObj = {};
				if (window.device.platform == iOSPlatform) {
					// iOS implements an OR operation, either of the Uuids found is okay
					paramsObj = { 'serviceUuids': [memoUuid, deviceInformationServiceUuid] };
				} else if (window.device.platform == androidPlatform) {
					// Android has an AND operation, deviceInformationServiceUuid does not seem to
					// be advertised, so this fails on Android
					paramsObj = { 'serviceUuids': [memoUuid] };
				}
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

	/**
	 * We found a device that has an device info service. Now we are gonna iterate through all the services to find
	 * the specific characteristics. We will subsequently "discover" this characteristic.
	 */
	self.deviceInfoSuccess = function(obj) {
		if (obj.status == "discoveredServices")
		{
			console.log("iOS: Discovered services. Iterate through them to get the right service");
			var serviceUuids = obj.serviceUuids;
			for (var i = 0; i < serviceUuids.length; i++) {
				var serviceUuid = serviceUuids[i];

				if (serviceUuid == deviceInformationServiceUuid) {
					console.log("iOS: Finding device information characteristics");
					var paramsObj = {"serviceUuid":deviceInformationServiceUuid, 
						"characteristicUuids":[serialNumberCharacteristicUuid]};
					bluetoothle.characteristics(function(result){
						console.log("iOS: " + JSON.stringify(result));
						bluetoothle.read(function(readData){
							console.log("iOS: Updating address " + readData.value + " to local storage");
							window.localStorage.setItem(addressKey,readData.value);
                            LocalDB.saveDeviceMapping(obj.address,readData.value,function(){
                                console.log("Stored device ID mapping of "+obj.address+" to "+readData.value)
                            });
							if (window.device.platform == iOSPlatform) {
								console.log("iOS: Discovering alert level service");
								var paramsObj = {"serviceUuids": [alertLevelServiceUuid] };
								bluetoothle.services(self.alertLevelSuccess, self.alertLevelError, paramsObj);
							} else if (window.device.platform == androidPlatform) {
								console.error("Android: Error! deviceInfoSuccess is a bluetoothle.services call" +
									"which doesn't exist on Android");
								//console.log("Beginning discovery");
								//bluetoothle.discover(self.discoverSuccess, self.discoverError);
							}
						},
						console.log,  {"serviceUuid":deviceInformationServiceUuid, 
							"characteristicUuid":serialNumberCharacteristicUuid});

					}, console.log, paramsObj);
					return;
				}
			}
			console.log("Error: device info service not found");
		}
		else
		{
			console.log("Unexpected services device info status: " + obj.status);
		}
		self.disconnectDevice();
	}



	/**
	 * We found a device that has an alert level service. Now we are gonna iterate through all the services to find
	 * the specific characteristics. We will subsequently "discover" this characteristic.
	 */
	self.alertLevelSuccess = function(obj) {
		if (obj.status == "discoveredServices")
		{
			var serviceUuids = obj.serviceUuids;
			for (var i = 0; i < serviceUuids.length; i++) {
				var serviceUuid = serviceUuids[i];

				if (serviceUuid == alertLevelServiceUuid) {
					console.log("Finding alert level characteristics");
					var paramsObj = {"serviceUuid":alertLevelServiceUuid, 
						"characteristicUuids":[alertLevelCharacteristicUuid]};
					bluetoothle.characteristics(self.characteristicsAlertLevelSuccess, 
							self.characteristicsAlertLevelError, paramsObj);
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

	self.deviceInfoError = function(obj) {
		console.log("Device info service error: " + obj.error + " - " + obj.message);
	}

	self.characteristicsAlertLevelSuccess = function(obj) {
		if (obj.status == "discoveredCharacteristics") {
			var characteristicUuids = obj.characteristicUuids;
			for (var i = 0; i < characteristicUuids.length; i++)
			{
				console.log("Alert level characteristics found, now discovering descriptor");
				var characteristicUuid = characteristicUuids[i];

				if (characteristicUuid == alertLevelCharacteristicUuid) {
					self.writeAlertLevel(defaultAlertLevel, 1000);
					//self.readLinkLoss();
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

	// function is only meant for iOS, not for Android
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

	// function is only meant for iOS, not for Android
	self.descriptorsAlertLevelError = function(obj)
	{
		console.log("Descriptors alert error: " + obj.error + " - " + obj.message);
		self.disconnectDevice();
	}

	self.discoverSuccess = function(obj)
	{
		if (obj.status == "discovered") {
			// here we are on Android, because iOS does not have discovery
			//console.log("Android: Discovery completed. The result is huge: " + JSON.stringify(obj));
			for (s in obj.services) {
				var service = obj.services[s];
				//console.log("Android: service " + JSON.stringify(service));
				if (service.serviceUuid == deviceInformationServiceUuid) {
					console.log("Android: found device information service");
					for (c in service.characteristics) {
						var characteristic = service.characteristics[c];
						if (characteristic.characteristicUuid == serialNumberCharacteristicUuid) {
							console.log("Android: found serialNumber characteristic");
							var paramsObj = {"serviceUuid":deviceInformationServiceUuid, 
								"characteristicUuid":serialNumberCharacteristicUuid};
							bluetoothle.read(function(readData){
								console.log("Android: Updating address " + readData.value + " to local storage");
								window.localStorage.setItem(addressKey,readData.value);
								self.writeAlertLevel(defaultAlertLevel, 1000);
							}, self.deviceInfoError, paramsObj);
						}
					}
				}
			}
		}
		else {
			console.log("Android: Unexpected discover status: " + obj.status);
			self.disconnectDevice();
		}
	}

	self.discoverError = function(obj)
	{
		console.log("Discover error: " + obj.error + " - " + obj.message);
		self.disconnectDevice();
	}

	/**
	 * Write the alert level, can be "high", "middle", or "low".
	 */
	self.writeAlertLevel = function(level, durationInMs) {
		if (memoBug0) {
			if (!self.memoBug0_exec) {
				self.memoBug0_callback = self.writeAlertLevel;
				self.memoBug0_cargs = level;
				self.memoBug0_exec = true;
				self.readLinkLoss();
				return;
			} else {
				self.memoBug0_callback = null;
				self.memoBug0_exec = false;
			}
		}

		var u8 = new Uint8Array(1);
		switch(level) {
			case "high":
				u8[0]=2;
				break;
			case "middle":
				u8[0]=1;
				break;
			case "low": default:
				u8[0]=0;
		};
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write alert level " + level + " (encoded as " + v + ") at service " + 
				alertLevelServiceUuid + ' and characteristic ' + alertLevelCharacteristicUuid);
		var paramsObj = {"serviceUuid": alertLevelServiceUuid, "characteristicUuid": alertLevelCharacteristicUuid, "value": v };
		bluetoothle.write(self.writeAlertLevelSuccess,console.log,paramsObj);

		// automatically turn off alertlevel after given time
		if (durationInMs !== undefined) {
			setTimeout(function () {
				self.writeAlertLevel("low");
			}, durationInMs);
		}
	}


	self.writeAlertLevelSuccess = function(obj) {
		if (obj.status == 'written') {
			console.log('Successful written alert level value: ' + obj.value);
		} else {
			console.log('Writing was not successful: ' + obj.status);
		}
	}

	self.writeAlertLevelError = function(obj) {
		console.log('Error in writing alert level: ' + obj.status);
	}

	self.readLinkLoss = function() {
		console.log("Read link loss level at service " + linkLossServiceUuid + ' and characteristic ' + linkLossCharacteristicUuid);
		var paramsObj = {"serviceUuid": linkLossServiceUuid, "characteristicUuid": linkLossCharacteristicUuid};
		bluetoothle.read(self.readLinkLossSuccess, self.readLinkLossError, paramsObj);
	}

	self.readLinkLossSuccess = function(obj) {
		if (obj.status == "read")
		{
			var bytes = bluetoothle.encodedStringToBytes(obj.value);
			console.log("Link loss: " + bytes[0]);

			if (memoBug0) {
				console.log("Some stupid bug in memo, requires me to send a read message first");
				if (self.memoBug0_callback)
					self.memoBug0_callback(self.memoBug0_cargs);
			}
		}
		else
		{
			console.log("Unexpected read status: " + obj.status);
			self.disconnectDevice();
		}
	}

	self.readLinkLossError = function(obj) {
		console.log('Error in reading link loss level', obj.status);
		self.memoBug0_callback(self.memoBug0_cargs);
	}

	self.readBatteryLevel = function() {
		console.log("Reading battery level, not yet implemented");
		//var paramsObj = {"serviceUuid":batteryServiceUuid, "characteristicUuid":batteryLevelCharacteristicUuid};
		//bluetoothle.read(readSuccess, readError, paramsObj);
	}

	self.disconnectDevice = function(disconnectSuccessCB, disconnectErrorCB) {
		var discError = disconnectErrorCB || self.disconnectError;
		var discSuccess = disconnectSuccessCB || self.disconnectSuccess;
		bluetoothle.disconnect(discSuccess, discError);
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

