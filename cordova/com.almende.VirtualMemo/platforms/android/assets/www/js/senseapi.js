/* Copyright (©) [2012] Sense Observation Systems B.V.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * JavaScipt CommonSense API Library
 * Author: Freek van Polen, Sense
 * Date: 19-10-2012
 * Dependencies:
 *          json2.js --> https://github.com/douglascrockford/JSON-js
 *          md5hash --> http://crypto-js.googlecode.com/svn/tags/3.0.2/build/rollups/md5.js
 **/

/**
 * ERROR CODES:
 * 0 - No Error
 * 1 - No XMLHttpRequest object
 * 2 - Wrong method given
 * 3 - Error in connection/request
 * 4 - Invalid arguments
 */

var SenseApi = (function () {

	// the object to return at the end
	var api = {};

	// helper function to obtain an XMLHttpRequest object
	getXMLHttpRequest = function () {
		r = false;
		if (window.XMLHttpRequest) { // Mozilla, Safari,...
			r = new XMLHttpRequest();
		} else if (window.ActiveXObject) { // IE
			try {
				r = new ActiveXObject("Msxml2.XMLHTTP");
			}
			catch (e) {
				try {
					r = new ActiveXObject("Microsoft.XMLHTTP");
				}
				catch (e) {}
			}
		}
		if (!r) {
			alert('Cannot create XMLHTTP instance');
			return false;
		}

		return r;
	};

	// private variables

	var session_id               = "";
	var response_status          = 0;
	var response_header          = {};
	var response_data            = {};
	var error_code               = 0;
	var api_url                  = "https://api.sense-os.nl";
	var server                   = "live";

	// private funtions
	SenseApiCall = function (method, url, data, headers) {
		var request = getXMLHttpRequest();
		if (request == false) {
			error_code = 1;
			return false;
		}
		if (method != "GET" && method != "POST" && method != "DELETE" && method != "PUT") {
			error_code = 2;
			return false;
		}

		// construct the url
		var full_url = api_url+url;
		if (method == "GET" || method == "DELETE") {
			// supply data as url parameters
			var str = [];
			for(var p in data) {
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(data[p]));
			}
			full_url = api_url + url + "?"+str.join("&");
		}

		request.open(method, full_url, false);

		// send headers
		for (var i=0; i<headers.length; i++) {
			request.setRequestHeader(headers[i].header_name, headers[i].header_value);
		}
		request.setRequestHeader('Accept', '*');
		if (session_id != "") {
			request.setRequestHeader('X-SESSION_ID', session_id);
		}

		// send data
		if (method == "POST" || method == "PUT") {
			if (typeof(data) == 'object') {
				request.setRequestHeader('Content-type', 'application/json');
				request.send(JSON.stringify(data));
			}
			else if (typeof(data) == 'string') {
				request.setRequestHeader('Content-type', 'text/plain');
				request.send(data);
			}
			else {
				request.send('');
			}
		}
		else {
			request.send('');
		}

		// obtain status
		response_status = request.status;

		// obtain headers
		response_header = {};
		var loc = request.getResponseHeader("Location");
		var sid = request.getResponseHeader("X-SESSION_ID");
		if (loc != null) {
			response_header['Location'] = loc;
		}
		if (sid != null) {
			response_header['X-SESSION_ID'] = sid;
		}

		// obtain response data
		response_data = request.responseText;

		// decide on return value
		if (response_status == 200 || response_status == 201 || response_status == 302) {
			return true;
		}
		else {
			error_code = 3;
			return false;
		}
	};


	// public access functions
	api.getSessionId = function () {
		return session_id;
	};

	api.getServer = function () {
		return server;
	};

	api.getApiUrl = function () {
		return api_url;
	};

	api.getResponseStatus = function () {
		return response_status;
	};

	api.getResponseHeader = function () {
		return response_header;
	};

	api.getResponseData = function () {
		return response_data;
	};

	api.getErrorCode = function () {
		return error_code;
	};

	// public set functions
	api.setSessionId = function (s) {
		session_id = s;
	};

	api.setServer = function (s) {
		if (s == 'live') {
			server = s;
			api_url = "https://api.sense-os.nl";
			return true;
		}
		else if (s == 'dev') {
			server = s;
			// NOTE: cant use https on dev server!
			api_url = "http://api.dev.sense-os.nl";
			return true;
		}

		return false;
	};

	// public api call functions

	/// A U T H E N T I C A T I O N ///

	api.createSession = function (username, password, successCB, errorCB) {
		var data = {"username":username, "password":password};
		if (SenseApiCall("POST", "/login.json", data, [])) {
			session_id = response_header['X-SESSION_ID'];
			successCB(session_id);
		}
		else {
			errorCB(response_status);
		}
	};

	api.deleteSession = function (successCB, errorCB) {
		if (SenseApiCall("POST", "/logout.json", {}, [])) {
			session_id = "";
			successCB(response_data);
		}
		else {
			errorCB(response_status);
		}
	};


	/// D A T A  P R O C E S S O R S ///

	api.dataProcessor = function (processor_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/dataprocessors/"+processor_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.dataProcessors = function (parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/dataprocessors.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createDataProcessor = function (parameters, successCB, errorCB) {
		if(SenseApiCall("POST", "/dataprocessors.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.updateDataProcessor = function (parameters, processor_id, successCB, errorCB) {
		if (SenseApiCall("PUT", "/dataprocessors/"+processor_id+".json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteDataProcessor = function (processor_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/dataprocessors/"+processor_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// D A T A  P R O C E S S O R S  &  F I L E S ///

	api.dataProcessorsFiles = function (successCB, errorCB) {
		if (SenseApiCall("GET", "/dataprocessors/files/", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.dataProcessorsFile = function (filename, successCB, errorCB) {
		if (SenseApiCall("GET", "/dataprocessors/files/"+filename, {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createDataProcessorsFile = function (filename, filedata, successCB, errorCB) {
		if (SenseApiCall("POST", "/dataprocessors/files/"+filename, filedata, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.updateDataProcessorsFile = function (filename, filedata, successCB, errorCB) {
		if (SenseApiCall("PUT", "/dataprocessors/files/"+filename, filedata, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteDataProcessorsFile = function (filename, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/dataprocessors/files/"+filename, {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	/// D E V I C E S ///

	api.devices = function (parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/devices.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.device = function(device_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/devices/"+device_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deviceSensors = function (device_id, parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/devices/"+device_id+"/sensors.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// E N V I R O N M E N T S ///

	api.environments = function (successCB, errorCB) {
		if (SenseApiCall("GET", "/environments.json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.environment = function (environment_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/environments/"+environment_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createEnvironment = function (parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/environments.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.updateEnvironment = function (environment_id, parameters, successCB, errorCB) {
		if (SenseApiCall("PUT", "/environments/"+environment_id+".json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteEnvironment = function (environment_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/environments/"+environment_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	// E N V I R O N M E N T S  &  S E N S O R S ///

	api.environmentSensors = function (environment_id, parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/environments/"+environment_id+"/sensors.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createEnvironmentSensor = function (environment_id, parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/environments/"+environment_id+"/sensors.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteEnvironmentSensor = function (environment_id, sensor_id, successCB, errorCB) {
		if (SenseApiCall("POST", "/environments/"+environment_id+"/sensors/"+sensor_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	/// G R O U P S ///

	api.allGroups = function (parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/groups/all.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.groups = function (parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/groups.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.group = function (group_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/groups/"+group_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createGroup = function (parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/groups.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.updateGroup = function (group_id, parameters, successCB, errorCB) {
		if (SenseApiCall("PUT", "/groups/"+group_id+".json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteGroup = function (group_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/groups/"+group_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// G R O U P S  &  U S E R S ///

	api.groupUsers = function (group_id, parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/groups/"+group_id+"/users.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.groupUser = function (group_id, user_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/groups/"+group_id+"/users/"+user_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createGroupUser = function (group_id, parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/groups/"+group_id+"/users.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.updateGroupUser = function (group_id, user_id, parameters, successCB, errorCB) {
		if (SenseApiCall("PUT", "/groups/"+group_id+"/users/"+user_id+".json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteGroupUser = function (group_id, user_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/groups/"+group_id+"/users/"+user_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// G R O U P S  &  S E N S O R S ///

	api.groupSensors = function (group_id, parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/groups/"+group_id+"/sensors.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createGroupSensor = function (group_id, parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/groups/"+group_id+"/sensors.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteGroupSensor = function (group_id, sensor_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/groups/"+group_id+"/sensors/"+sensor_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// S E N S O R S ///

	api.sensors = function (parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.sensor = function (sensor_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors/"+sensor_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createSensor = function (parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/sensors.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.updateSensor = function (sensor_id, parameters, successCB, errorCB) {
		if (SenseApiCall("PUT", "/sensors/"+sensor_id+".json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteSensor = function (sensor_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/sensors/"+sensor_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.sensorsFind = function (namespace, parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/sensors/find.json?namespace="+namespace, parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// S E N S O R S  &  D A T A ///

	api.sensorData = function (sensor_id, parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors/"+sensor_id+"/data.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createSensorData = function (sensor_id, data, successCB, errorCB) {
		if (SenseApiCall("POST", "/sensors/"+sensor_id+"/data.json", data, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createSensorsData = function (data, successCB, errorCB) {
		if (SenseApiCall("POST", "/sensors/data.json", data, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteSensorData = function (sensor_id, data_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/sensors/"+sensor_id+"/data/"+data_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	/// S E N S O R S  &  E N V I R O N M E N T S ///

	api.sensorEnvironment = function (sensor_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors/"+sensor_id+"/environment.json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// S E N S O R S  &  D E V I C E S ///

	api.sensorDevice = function (sensor_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors/"+sensor_id+"/device.json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createSensorDevice = function (sensor_id, parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/sensors/"+sensor_id+"/device.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteSensorDevice = function (sensor_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/sensors/"+sensor_id+"/device.json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// S E N S O R S  &  S E R V I C E S ///

	api.sensorsAvailableServices = function (successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors/services/available.json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.sensorAvailableServices = function (sensor_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors/"+sensor_id+"/services/available.json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.sensorRunningServices = function (sensor_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors/"+sensor_id+"/services.json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createSensorService = function (sensor_id, parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/sensors/"+sensor_id+"/services.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteSensorService = function (sensor_id, service_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/sensors/"+sensor_id+"/services/"+service_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.sensorServiceMethods = function (sensor_id, service_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors/"+sensor_id+"/services/"+service_id+"/methods.json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.sensorServiceLearn = function (sensor_id, service_id, parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/sensors/"+sensor_id+"/services/"+service_id+"/manualLearn.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.sensorServiceMethod = function (sensor_id, service_id, method_name, parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/sensors/"+sensor_id+"/services/"+service_id+"/"+method_name+".json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createSensorServiceMethod = function (sensor_id, service_id, method_name, parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/sensors/"+sensor_id+"/services/"+service_id+"/"+method_name+".json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// M E T A T A G S ///

	api.sensorsMetatags = function (namespace, parameters, successCB, errorCB) {
		var ns = (namespace != null) ? namespace : "default";
		parameters.namespace = ns
			if (SenseApiCall("GET", "/sensors/metatags.json", parameters, []))
				successCB(response_data);
			else
				errorCB(response_status);
	};

	api.sensorMetatags = function (sensor_id, namespace, successCB, errorCB) {
		var ns = (namespace != null) ? namespace : "default";
		if (SenseApiCall("GET", "/sensors/"+sensor_id+"/metatags.json", {'namespace':ns}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createSensorMetatags = function (sensor_id, namespace, metatags, successCB, errorCB) {
		var ns = (namespace != null) ? namespace : "default";
		if (SenseApiCall("POST", "/sensors/"+sensor_id+"/metatags.json?namespace="+ns, metatags, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.updateSensorMetatags = function (sensor_id, namespace, metatags, successCB, errorCB) {
		var ns = (namespace != null) ? namespace : "default";
		if (SenseApiCall("PUT", "/sensors/"+sensor_id+"/metatags.json?namespace="+ns, metatags, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteSensorMetatags = function (sensor_id, namespace, successCB, errorCB) {
		var ns = (namespace != null) ? namespace : "default";
		if (SenseApiCall("DELETE", "/sensors/"+sensor_id+"/metatags.json", {'namespace':ns}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	/// U S E R S ///

	api.userCurrent = function (successCB, errorCB) {
		if (SenseApiCall("GET", "/users/current.json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.users = function (parameters, successCB, errorCB) {
		if (SenseApiCall("GET", "/users.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.user = function (user_id, successCB, errorCB) {
		if (SenseApiCall("GET", "/users/"+user_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.createUser = function (parameters, successCB, errorCB) {
		if (SenseApiCall("POST", "/users.json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.updateUser = function (user_id, parameters, successCB, errorCB) {
		if (SenseApiCall("PUT", "/users/"+user_id+".json", parameters, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};

	api.deleteUser = function (user_id, successCB, errorCB) {
		if (SenseApiCall("DELETE", "/users/"+user_id+".json", {}, []))
			successCB(response_data);
		else
			errorCB(response_status);
	};


	// return the api object
	return api;

}());

