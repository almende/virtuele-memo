var iBeaconHandler = function() {
	var self = this;
	var iBeaconUuid = '2ca36943-7fde-4f4e-9c08-dda29f079349';
	var region = new ibeacon.Region({
		uuid: iBeaconUuid
	});

	self.dynamicSort = function(property) {
		var sortOrder = 1;
		if(property[0] === "-") {
			sortOrder = -1;
			property = property.substr(1);
		}
		return function (a,b) {
			var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
			return result * sortOrder;
		}
	}

	self.scanForIBeacons = function(callback) {
		console.log("Started to scan for beacons");
		ibeacon.startRangingBeaconsInRegion({
			region: region,
			didRangeBeacons: function(result) {
				if (result.beacons.length == 0) {
					console.log("No beacons nearby");
				}
				result.beacons.sort(self.dynamicSort("-rssi"));

				var nearestBeacon = null;
				for (var i = 0; i < result.beacons.length; i++) {
					console.log('Found beacon: ' + JSON.stringify(result.beacons[i]));
					if (nearestBeacon == null) {
						nearestBeacon = result.beacons[i];
					} else {
						console.log("Found multiple beacons, keeping: " + JSON.stringify(nearestBeacon));
						console.log("Found multiple beacons, disposing: " + JSON.stringify(result.beacons[i]));
					}
				}
				ibeacon.stopMonitoringForRegion({
					region: region
				});
                  ibeacon.stopRangingBeaconsInRegion({
                                            region: region
                                        });
				//if (nearestBeacon != null)
				callback(nearestBeacon);
				//}
		}});
	callback(null);
}
}
