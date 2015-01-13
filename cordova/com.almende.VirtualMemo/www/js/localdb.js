/**
 * ERROR CODES:
 * 0 - No error, success!
 * 1 - Empty table
 * 2 - Field (column in table) does not exist
 * 3 - Comparison error
 */

var LocalDB = (function () {

	// The API is returned as an object. The functions like getXMLHttpRequest etc. are not part of the public API 
	// in this way. Only functions that are explicitly added to the API object will be part of it.
	var api = {};

	var SUCCESS = 0;
	var ERR_GENERAL = 1;
	var ERR_EMPTY_TABLE = 2;
	var ERR_FIELD_ABSENT = 3;
	var ERR_COMPARE = 4;

	// private variables

	var suki_hack = true;

	var db;

	donotProcess = function(result, callback, cargs) {
		if (typeof(callback) == "function") {
			callback(result, cargs);
		} else {
			console.log("Error, callback not defined. Result " + JSON.stringify(result) + " will get lost");
		}
	};

	noCallback = function(args) {
	}

	processFirst = function(results, param, callback, cargs) {
		// TODO check for proper fields
		var key = param.key;
		if (typeof(callback) != "function") {
			console.log("Error, callback not defined. Result will get lost");
			return;
		}

		var errcode;
		var len = results.rows.length;
		if (!len) {
			errcode = ERR_EMPTY_TABLE;
			callback(errcode, null, cargs);
			return;
		}
		var i = len-1; 
		if (key === '*') {
			result = results.rows.item(i);
			errcode = SUCCESS;
			callback(errcode, result, cargs);
		}
		if (!results.rows.item(i)[key]) {
			errcode = ERR_FIELD_ABSENT;
			callback(errcode, null, cargs);
			return;
		}
		result = results.rows.item(i)[key];
		errcode = SUCCESS;
		callback(errcode, result, cargs);
	}

	processFirstCompare = function(results, param, callback, cargs) {
		// TODO check for proper fields
		var key = param.key;
		var compare = param.compare;
		if (typeof(callback) != "function") {
			console.log("Error, callback not defined. Result will get lost");
			return;
		}

		var errcode;
		var len = results.rows.length;
		if (!len) {
			errcode = ERR_EMPTY_TABLE;
			callback(errcode, null, cargs);
			return;
		}
		var i = len-1; 
		result = results.rows.item(i)[key];
		if (!results.rows.item(i)[key]) {
			errcode = ERR_FIELD_ABSENT;
			callback(errcode, null, cargs);
			return;
		}
		if (compare != result) {
			errcode = ERR_COMPARE;
			callback(errcode, null, cargs);
			return;
		}
		errcode = SUCCESS;
		callback(errcode, result, cargs);
	}


	/**
	 * Query the database. If successful, process the resulting information and call the callback function. The 
	 * process function is responsible for setting callback parameters to indicate success
	 */
	queryDB = function(query, param, process, callback, cargs) {
		db.transaction(function executeSql(tx) {
			tx.executeSql(query, param,
				function processQuery(tx, result) {
					process(result, callback, cargs);
				}, 
			function(tx, error) {
				var errcode = ERR_GENERAL;
				if (callback && typeof(callback) === "function") {
					callback(errcode, error.message, cargs);
				} else {
					console.error("General mysql transation error: " + error.message);
				}
			});
		});
	}

	queryExtDB = function(query, param, process, pargs, callback, cargs) {
		console.log("Query database with " + query);
		db.transaction(function executeSql(tx) {
			tx.executeSql(query, param,
				function processQuery(tx, result) {
					process(result, pargs, callback, cargs);
				}, 
			function(tx, error) {
				var errcode = ERR_GENERAL;
				if (callback && typeof(callback) === "function") {
					callback(errcode, error.message, cargs);
				} else {
					console.error("General mysql transation error: " + error.message);
				}
			});
		});
	}

	// public methods

	api.init = function(database) {
		db = database;
	}

	/**
	 * Error fields for external use
	 */

	api.SUCCESS = SUCCESS;
	api.ERR_GENERAL = ERR_GENERAL;
	api.ERR_EMPTY_TABLE = ERR_EMPTY_TABLE;
	api.ERR_FIELD_ABSENT = ERR_FIELD_ABSENT;
	api.ERR_COMPARE = ERR_COMPARE;
	
	/**
	 * Create table for users
	 */
	api.createUsers = function(callback, cargs) {
		var query = 'CREATE TABLE IF NOT EXISTS MEMO (name, password, email, code)';
		var param = [];
		queryDB(query, param, donotProcess, callback, cargs);
	}


    /**
     * Create table for devices
     */
    api.createDevices = function(callback, cargs) {
        var query = 'CREATE TABLE IF NOT EXISTS DEVICE (device_id, uuid)';
        var param = [];
        queryDB(query, param, donotProcess, callback, cargs);
    }

	/**
	 * Delete table for users
	 */
	api.deleteUsers = function(callback, cargs) {
		var query = 'DROP TABLE IF EXISTS MEMO';
		var param = [];
		queryDB(query, param, donotProcess, callback, cargs);
	}

	/*
	 * Add a user to the database
	 */
	api.createUser = function(name, password, email, code, callback, cargs) {
		var query = 'INSERT INTO MEMO (name, password, email, code) VALUES (?,?,?,?)';
		var param = [name, password, email, code];
		queryDB(query, param, donotProcess, callback, cargs);
	}
	
	/**
	 * Get a random user from the database.
	 */
	api.getUser = function(callback, cargs) {
		var query =  'SELECT * FROM MEMO';
		var param = [];
		var pargs = {
			key: '*'
		}
		queryExtDB(query, param, processFirst, pargs, callback, cargs);
	}

	/*
	 * Add a single memo.
	 */
	api.createMemo = function(sensor_id, callback, cargs) {
		var query = 'INSERT INTO NOTES (sensor_id) VALUES (?)';
		var param = [sensor_id];
		queryDB(query, param, donotProcess, callback, cargs);
	}

    /*
     * save the device mapping
     */
    api.saveDeviceMapping = function(device_id, uuid, callback, cargs) {
        api.createDevices(function() {
            var query = 'INSERT INTO DEVICE (device_id, uuid) VALUES (?, ?)';
            var param = [device_id, uuid];
            queryDB(query, param, donotProcess, callback, cargs);
        });
    }

    api.deleteMapping = function(callback, cargs) {
        var query = 'DROP TABLE IF EXISTS DEVICE';
        var param = [];
        queryDB(query, param, donotProcess, callback, cargs);
    }
               
    api.getDeviceUUIDbyDeviceId =function(device_id, callback, cargs) {
        api.createDevices(function() {
            var query =  'SELECT * FROM DEVICE WHERE device_id = ?';
            var param = [device_id];
            var pargs = {
                key: '*'
            }
            queryExtDB(query, param, processFirst, pargs, callback, cargs);
        });
    }

    api.getDeviceIdByDeviceUUID =function(uuid, callback, cargs) {
        api.createDevices(function() {
            var query =  'SELECT * FROM DEVICE WHERE uuid = ?';
            var param = [uuid];
            var pargs = {
                key: '*'
            }
            queryExtDB(query, param, processFirst, pargs, callback, cargs);
        });
    }


    /**
	 * Check if a specific memo exists with field "sensor_id" equal to the parameter value sensor_id
	 */
	api.existMemo = function(sensor_id, callback, cargs) {
		if (suki_hack) {
        		api.createMemos(noCallback);
		}
		var query =  'SELECT * FROM NOTES';
		var param = [];
		var pargs = {
			key: 'sensor_id',
			compare: sensor_id
		}
		queryExtDB(query, param, processFirstCompare, pargs, callback, cargs);
	}

	/**
	 * Get a random memo from the database.
	 */
	api.getMemo = function(callback, cargs) {
		if (suki_hack) {
        		api.createMemos(noCallback);
		}
		var query =  'SELECT * FROM NOTES';
		var param = [];
		var pargs = {
			key: 'sensor_id',
		}
		queryExtDB(query, param, processFirst, pargs, callback, cargs);
	}

	/**
	 * Create table for memos
	 */
	api.createMemos = function(callback, cargs) {
		var query = 'CREATE TABLE IF NOT EXISTS NOTES (sensor_id)';
		var param = [];
		queryDB(query, param, donotProcess, callback, cargs);
	}

	/**
	 * Delete table for memos
	 */
	api.removeMemos = function(callback, cargs) {
		var query = 'DROP TABLE IF EXISTS NOTES';
		var param = [];
		queryDB(query, param, donotProcess, callback, cargs);
	}

	/**
	 * Check if any memo does exist
	 */
	api.existMemos = function(callback, cargs) {
		if (suki_hack) {
        		api.createMemos(noCallback); // Anne: sure, then this function is pretty useless...
		}
        	var query =  'SELECT * FROM NOTES';
		var param = [];
		queryDB(query, param, donotProcess, callback, cargs);
	}

	return api;
}());

