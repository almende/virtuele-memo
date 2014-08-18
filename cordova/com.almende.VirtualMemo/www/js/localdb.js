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
	var ERR_EMPTY_TABLE = 1;
	var ERR_FIELD_ABSENT = 2;
	var ERR_COMPARE = 3;

	// private variables

	var db;

	onError = function(msg) {
		console.log("Error: ", msg);
	};

	donotProcess = function(result, callback) {
		if (typeof(callback) == "function") {
			callback(result);
		} else {
			console.log("Error, callback not defined. Result will get lost");
		}
	};

	processFirst = function(results, param, callback) {
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
			callback(errcode);
			return;
		}
		var i = len-1; 
		if (!results.rows.item(i)[key]) {
			errcode = ERR_FIELD_ABSENT;
			callback(errcode);
			return;
		}
		result = results.rows.item(i)[key];
		errcode = SUCCESS;
		callback(errcode, result);
	}

	processFirstCompare = function(results, param, callback) {
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
			callback(errcode);
			return;
		}
		var i = len-1; 
		result = results.rows.item(i)[key];
		if (!results.rows.item(i)[key]) {
			errcode = ERR_FIELD_ABSENT;
			callback(errcode);
			return;
		}
		if (compare != result) {
			errcode = ERR_COMPARE;
			callback(errcode);
			return;
		}
		errcode = SUCCESS;
		callback(errcode, result);
	}


	/**
	 * Query the database. If successful, process the resulting information and call the callback function. The 
	 * process function is responsible for setting callback parameters to indicate success
	 */
	queryDB = function(query, param, errCB, process, callback) {
		db.transaction(function(tx) {
			tx.executeSql(query, param,
				function(tx, result) {
					process(result, callback);
				}, 
				errCB);
		});
	}

	queryExtDB = function(query, param, errCB, process, pargs, callback) {
		db.transaction(function(tx) {
			tx.executeSql(query, param,
				function(tx, result) {
					process(result, pargs, callback);
				}, 
				errCB);
		});
	}

	// public methods

	api.init = function(database) {
		db = database;
	}
	
	api.SUCCESS = 0;
	api.ERR_EMPTY_TABLE = 1;
	api.ERR_FIELD_ABSENT = 2;
	api.ERR_COMPARE = 3;

	/*
	 * Add a single memo.
	 */
	api.createMemo = function(sensor_id, callback) {
		var query = 'INSERT INTO NOTES (sensor_id) VALUES (?)';
		var param = [sensor_id];
		queryDB(query, param, onError, donotProcess, callback);
	}

	/**
	 * Check if a specific memo exists with field "sensor_id" equal to the parameter value sensor_id
	 */
	api.existMemo = function(sensor_id, callback) {
		var query =  'SELECT * FROM NOTES';
		var param = [];
		var pargs = {
			key: 'sensor_id',
			compare: sensor_id
		}
		queryExtDB(query, param, onError, processFirstCompare, pargs, callback);
	}

	/**
	 * Get a random memo from the database.
	 */
	api.getMemo = function(callback) {
		var query =  'SELECT * FROM NOTES';
		var param = [];
		var pargs = {
			key: 'sensor_id',
		}
		queryExtDB(query, param, onError, processFirst, pargs, callback);
	}

	/**
	 * Create table for memos
	 */
	api.createMemos = function(callback) {
		var query = 'CREATE TABLE IF NOT EXISTS NOTES (sensor_id)';
		var param = [];
		queryDB(query, param, onError, donotProcess, callback);
	}

	/**
	 * Check if any memo does exist
	 */
	api.existMemos = function(callback) {
		var query =  'SELECT * FROM NOTES';
		var param = [];
		queryDB(query, param, onError, donotProcess, callback);
	}


	return api;
}());

