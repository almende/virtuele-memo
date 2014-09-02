function WotsApp() {

	/**************************************************************************************************************
	 * Fields that we use in the WOTS application
	 *************************************************************************************************************/

	this.exhibitors = [];
	this.exhibitorsById = {};
	this.route = [];
	this.selectedExhibitorId = null;
	this.guide = [];
	this.guideSubPageCnt = 0;
	this.username = "";
	this.email = "";
	this.db = null;
	this.participantCode = "";
	this.password = "";
	this.passcode = "";
	this.calculated = false;
	this.memos = [];

	this.afterRegistration = null;
	this.address = null;
	this.updateAddress = false;
	this.isConnected = false;

	this.platform = null;
}

/**********************************************************************************************************************
 * Main functionality of the WOTS application
 *********************************************************************************************************************/

/**
 * This application is created using cordova (open-source phonegap variant). There are several plugins at work, for 
 * example for the bluetooth functionality.
 *
 * Just normal jQuery can be used to hook into the ../index.html file.
 * For example the html element with id="exhibitorListPage" can just be queried as $('#exhibitorListPage') and all kind 
 * of other functionality works just like expect.
 */

WotsApp.prototype = {
	start:function() {
		var wots = this;

		var ble = new BLEHandler();

		var sense = SenseAPI;

		var localdb = LocalDB;

		var crypto = CryptoJS;

		$.ajaxSetup({ cache: false });

		// very important statement to make swiping work: 
		// https://stackoverflow.com/questions/12838443/\
		//   swipe-with-jquery-mobile-1-2-phonegap-2-1-and-android-4-0-4-not-working-properl
		// can not make it work for stupid android, just make sure there is a menu option everywhere that does
		// the same
		// the work-around would be to set event.preventDefault() for only horizontal touchmove events
		// https://github.com/jquery/jquery-mobile/issues/5534
		var touch = {};
		document.ontouchstart = function(event) {
			var t = event.touches[0];
			touch.x = t.clientX;
			touch.y = t.clientY;	
			console.log("Current: " + touch.x + " and " + touch.y);
		}
		// but I can not turn this on, or else the default scrolling does not work
		document.ontouchmove = function(event) {
			if (event.touches.length == 1) { 
				var t = event.touches[0];
				var deltaX = t.clientX - touch.x;
				var deltaY = t.clientY - touch.y;
				var absX = Math.abs(deltaX);
				var absY = Math.abs(deltaY);
				console.log("Distances: " + absX + " and " + absY);
				if (absX > absY) {
					console.log("Prevent default");
					event.preventDefault();
				}
			}
		};

		var testing = false;
		var test_sense = false;

		// This option makes use of the CommonSense database in the way suggested by Sense itself. 
		// It creates a user for every device. 
		var device_as_user = true;

		// at which page to start?
		start = function() {

			console.log("Started the WOTS application");
			init();

			// first page to visit, should be in the end the guidePage for the WOTS conference
			// guidePage();

			// for debugging, enable one of the following pages as first page
			// congratsPage();
			allExhibitorsPage();
			// guideHomePage();
			// registerPage();
			// memoOverviewPage();
			// memoPage();
		}

		init = function() {
			wots.afterRegistration = calcRoutePage;

			console.log("We are running on the \"" + device.platform + "\" platform");
			wots.platform = device.platform;
			console.log("With device name \"" + device.name + "\"");

			if (!wots.platform) {
				// we are running in chrome, not in Android or iOS at least
				console.log("Just disable the device-as-user option");
				device_as_user = false;
			}
			//testing = true;
		}

		/*******************************************************************************************************
		 * A list of helper functions for the GUI
		 ******************************************************************************************************/

		wrongCodeAlert = function(message) {
			console.log(message);
			if (navigator.notification && navigator.notification.alert) {
				console.log("Show the alert to the user");
				navigator.notification.alert(
						message, // string
						alertCallback, // callback
						'Wrong code', // title
						'Try again' // button name
						);
			} else {
				console.log("Navigator is undefined. Show an ugly browser alert message");
				alert(message);
			}
		};

		failedLoginAlert = function(message) {
			console.log(message);
			if (navigator.notification && navigator.notification.alert) {
				console.log("Show the alert to the user");
				navigator.notification.alert(
						message, // string
						alertCallback, // callback
						'Failed login', // title
						'Try again' // button name
						);
			} else {
				console.log("Navigator is undefined. Show an ugly browser alert message");
				alert(message);
			}
		};

		incompleteAccountAlert = function(message) {
			console.log(message);
			if (navigator.notification && navigator.notification.alert) {
				console.log("Show the alert to the user");
				navigator.notification.alert(
						message, // string
						alertCallback, // callback
						'Incomplete account', // title
						'Try again' // button name
						);
			} else {
				console.log("Navigator is undefined. Show an ugly browser alert message");
				alert(message);
			}
		};

		alertCallback = function() {
		};

		/*******************************************************************************************************
		 * The list of exhibitors
		 ******************************************************************************************************/

		// this loads exhibitor information from a local .js data file, but doesn't know how to store state
		// information...
		$('#exhibitorListPage').on('pageshow', function() {
			$.getJSON('data/exhibitors.js', function(data) {
				var exhibitorList = $('#exhibitorList');
				// store exhibitors in global variable, lost after application restart...
				wots.exhibitors = data;

				if (!wots.username) {
					console.log("Information about user lost, maybe due to a refresh. Get info from DB again.");
					accountDB(accountCheckFinished);
				} else {
					standsDB(updateList);
				}
			});
		});

		accountCheckFinished = function() {
			console.log("Account refreshed, now check if we have the participantCode");
			if (!wots.participantCode) {
				incompleteAccountAlert("We don't have the right participantCode available, sorry you have to enter it again!");
				registerPage();
			} else {
				interpretCode(wots.participantCode);
				standsDB(updateList);
			}
		}

		updateList = function() {
			console.log("Update stands");
			// remove previous list
			$("#exhibitorList").empty();
			var prevExhibitor = null;
			var nextExhibitor = null;
			var pastSomeDone = false;

			// update fields that are undefined
			for (var c = 0; c < wots.exhibitors.length; c++) {
				var exhibitor = wots.exhibitors[c];
				if (typeof exhibitor.status == 'undefined') {
					exhibitor.status = "open";
				}
				if (typeof exhibitor.oneliner == 'undefined') {
					exhibitor.oneliner = '';
				}
			}
			var route_exhibitors = [];

			// find exhibitor information for the route
			for (var r = 0; r < wots.route.length; r++) {
				var exhibitor;
				for (var c = 0; c < wots.exhibitors.length; c++) {
					exhibitor = wots.exhibitors[c];
					// console.log("Is stand " + exhibitor.standletter + " on the route?");
					if (wots.route[r] == exhibitor.standletter) {
						console.log("Found exhibitor", exhibitor);
						route_exhibitors.push(exhibitor);
						break;
					}
				}
			}

			// go through all exhibitors on the route
			for (var i = 0; i < route_exhibitors.length; i++) {
				var exhibitor = route_exhibitors[i];
				if (!exhibitor) {
					console.error("Exhibitor is empty!");
					continue;
				}
				// create list with references
				wots.exhibitorsById[exhibitor.id] = exhibitor;
				if (i > 0) {
					prevExhibitor = route_exhibitors[i - 1];
				} else {
					prevExhibitor = null;
				}
				if (i + 1 < route_exhibitors.length) {
					nextExhibitor = route_exhibitors[i + 1];
				} else {
					nextExhibitor = null;
				}
				var doneClass = "";
				var enabledClass = "taskDisabled";
				if(exhibitor.status == "done") {
					pastSomeDone = true;
					enabledClass = 'taskEnabled';
					// set css such that the graphical elements can be combined
					if(prevExhibitor && prevExhibitor.status == "done") {
						if(nextExhibitor && nextExhibitor.status == "done")
							doneClass = "taskDoneBoth";
						else
							doneClass = "taskDoneUp";
					}
					else {
						if(nextExhibitor && nextExhibitor.status == "done")
							doneClass = "taskDoneDown";
						else
							doneClass = "taskDoneSelf";
					}
				} else {
					if (prevExhibitor && prevExhibitor.status == "done") 
						enabledClass = "taskEnabled";
					if (!prevExhibitor) 
						enabledClass = "taskEnabled";
				}
				console.log("Add exhibitor to the list with name " + exhibitor.name + " and id " + exhibitor.id);
				$(exhibitorList)
					.append($('<li/>', { "class":doneClass + ' ' + enabledClass })
							.append($('<a/>', {
								'href':'#', // will be done by exhibitorList.on(click)
								'data-transition':'slide',
								'data-id':exhibitor.id
							})
								.append('<span>' + exhibitor.name + '</span>')
								.append('<p>' + exhibitor.oneliner + '</p>')
							       )
					       );
			} // End for-loop
			$('#exhibitorList').listview('refresh');

			// $.event.special.swipe.horizontalDistanceThreshold = 120;
			//$.event.special.swipe.horizontalDistanceThreshold = window.devicePixelRatio >= 2 ? 15 : 30;
			//$.event.special.swipe.verticalDistanceThreshold = window.devicePixelRatio >= 2 ? 15 : 30;		
		}

		$('#exhibitorList').on('click', 'li a', function(event) {
			wots.selectedExhibitorId = $(this).attr('data-id');
			console.log("Selected exhibitor with id " + wots.selectedExhibitorId);
			$.mobile.changePage("#exhibitorDetailsPage", {transition:'slide', hashChange:true});
			event.preventDefault();
		});

		$('#exhibitorListPage').on('swiperight', function(event) {
			$('#virtualMemoPanel').panel("open");
		});

		/*******************************************************************************************************
		 * The list of exhibitors
		 ******************************************************************************************************/

		allExhibitorsPage = function() {	
			console.log("Go to the page with all exhibitors");
			$.mobile.changePage("#allExhibitorsPage", {transition:'none', hashChange:true});
		};

		// this loads exhibitor information from a local .js data file, but doesn't know how to store state
		// information...
		$('#allExhibitorsPage').on('pageshow', function() {
			$.getJSON('data/exhibitors.js', function(data) {
				var allExhibitorsList = $('#allExhibitorsList');
				console.log("Update list of all exhibitors");
				// remove previous list
				allExhibitorsList.empty();
				
				// update array
				wots.exhibitors = data;

				// update fields that are undefined
				for (var c = 0; c < wots.exhibitors.length; c++) {
					var exhibitor = wots.exhibitors[c];
					wots.exhibitorsById[exhibitor.id] = exhibitor;
					if (typeof exhibitor.status == 'undefined') {
						exhibitor.status = "open";
					}
					if (typeof exhibitor.oneliner == 'undefined') {
						exhibitor.oneliner = '';
					}
					allExhibitorsList.append($('<li/>', "class:taskDownSelf taskEnabled")
						.append(
							$('<a/>', {
								'href':'#',
								'data-transition':'slide',
								'data-id':exhibitor.id
							})
							.append('<span>' + exhibitor.name + '</span>')
							.append('<p>' + exhibitor.oneliner + '</p>')
						       )
						);
				}

				$('#allExhibitorsList').listview('refresh');
			});
		});

		$('#allExhibitorsList').on('click', 'li a', function(event) {
			wots.selectedExhibitorId = $(this).attr('data-id');
			console.log("Selected exhibitor with id " + wots.selectedExhibitorId);
			$.mobile.changePage("#allExhibitorsDetailsPage", {transition:'slide', hashChange:true});
			event.preventDefault();
		});
		
/*
		$('#allExhibitorsList').on('touchstart', function(event) {
			console.log("Touch start detected");
			event.stopPropagation();
			//event.preventDefault();
		});

		$('#allExhibitorsList').on('touchend', function(event) {
			console.log("Touch end detected");
			event.stopPropagation();
			//event.preventDefault();
		});
		*/
		$('#allExhibitorsPage').on('swiperight', function(event) {
			console.log("Open panel in partner list");
			$('#virtualMemoPanel0').panel("open");
		});

		/*******************************************************************************************************
		 * Individual exhibitor page, but just informational
		 ******************************************************************************************************/

		$('#allExhibitorsDetailsPage').on("pagebeforeshow", function() {
			console.log('Show exhibitor ' + wots.selectedExhibitorId);
			var exhibitor = wots.exhibitorsById[wots.selectedExhibitorId];
			if (exhibitor) {
				if (exhibitor.logo) {
					$('#allExhibitorLogo').attr('src', 'logos/600-width/' + exhibitor.logo);
				}
				if (exhibitor.name) {
					$('#allExhibitorsDetailsPage .ui-title').text(exhibitor.name);
				}
				if (exhibitor.address) {
					$('#allExhibitorAddress').text(exhibitor.address);
				}
				if (exhibitor.tel) {
					$('#allExhibitorTel').text('tel:' + exhibitor.tel);
				}
				if (exhibitor.website) {
					$('#allExhibitorWebsite').html('<a href="' + exhibitor.website + '">' +
						exhibitor.website + '</a>');
				}
				if (exhibitor.email) {
					$('#allExhibitorEmail').html('<a href="mailto:' + exhibitor.email + 
						'?Subject=Memo">' +
						exhibitor.email + '</a>');
				}
			} else {
				console.error('Could not select ' + wots.selectedExhibitorId);
			}
		});

		/*******************************************************************************************************
		 * The individual exhibitor has a detailed page, where a code needs to be filled in
		 ******************************************************************************************************/

		// we can show details of the exhibitor and some questions, but do not know how to cope with the answer yet
		$('#exhibitorDetailsPage').on("pagebeforeshow", function( event, ui ) {
			var exhibitor = wots.exhibitorsById[wots.selectedExhibitorId];
			if (exhibitor) {
				if (exhibitor.logo) {
					$('#exhibitorLogo').attr('src', 'logos/600-width/' + exhibitor.logo);
				}
				if (exhibitor.name) {
					$('#exhibitorDetailsPage .ui-title').text(exhibitor.name);
				}

				if (exhibitor.questions) {
					// we pick a random question to show to the user
					if (typeof exhibitor.activeQuestion == 'undefined') {
						var index = Math.floor(Math.random() * exhibitor.questions.length);
						exhibitor.activeQuestion = exhibitor.questions[index];
					}
					var questionText = "Geen specifieke vraag, maar welkom bij onze stand!";
					if (typeof exhibitor.activeQuestion != 'undefined') {
						questionText = exhibitor.activeQuestion.question;
					}
					$('#passcode').keyup( function(event) {
						if (event.keyCode == 13) {
							var passcode = $('#passcode').val();
							checkWotsPasscode(passcode);        	
						}
					});
					$('#questionParagraph').text(questionText);
					if (!wots.participantCode) {
						console.log("There is no participant code set, something went wrong?");
					} else {
						$('#questionReminderParticipantCode').text("Deelnemercode: " + wots.participantCode);
					}
				}
			} else {
				// user pressed refresh, let's go back
				console.log("Refresh doesn't work so well, let's go back to the list");
				wotsPage();
			}

			var canvas = document.getElementById('triangle');
			var context = canvas.getContext('2d');
			var height = 30;
			var width = 30;
			context.canvas.width = window.innerWidth;
			context.canvas.height = height;
			context.beginPath();
			var startX = (window.innerWidth / 2) - (width / 2);
			context.moveTo(startX, 0);
			context.lineTo(startX + width, 0);
			context.lineTo(startX + (width / 2), height);
			context.closePath();
			context.fillStyle = "rgb(240, 234, 34)";
			context.fill();
		});

		/*******************************************************************************************************
		 * The functionality around the memo notes
		 ******************************************************************************************************/

		memoPage = function() {	
			console.log("Go to the memo page");
			$.mobile.changePage("#virtualMemoPage", {transition:'none', hashChange:true});
		};

		// on Android horizontal swipe distance might be too wide, you'll have to swipe far and fast...
		// do something about it!
		$('#virtualMemoPage').on('swiperight', function(event) {
			$('#virtualMemoPanel').panel("open");
		});

		$('#virtualMemoPage').on('pagecreate',function(e,data) { 
			console.log("Add colors");
			var colors = [ "0000ff", "00ff00", "00ffff", "ff0000", "ff00ff", "ffff00" ];
			for (var c = 0; c < colors.length; ++c) {
				var $li = $('<li/>', {'color':colors[c]});
				$li.css('list-style-image', 'url(css/images/dot0x' + colors[c] + '.png)');
				$li.css('list-style-position', 'inside');
				$li.on('click', function(event) {
					var color=$(this).attr ( "color" );
					console.log("Set color to: " + color);
					setMemoColor(color);
				});
				$('#colorPicker ul').append($li);
			}

			$('#saveMemo').on('click', function(event) {
				updateSensor();
			});

			$('#deleteMemo').on('click', function(event) {
				deleteSensorData();
			});

			$('#prevMemo').on('click', function(event) {
				var memo_id = getCurrentMemoId();
				memo_id = (memo_id + wots.memos.length - 1) % wots.memos.length;	
				displaySensorData(memo_id);
			});

			$('#nextMemo').on('click', function(event) {
				var memo_id = getCurrentMemoId();
				memo_id = (memo_id + wots.memos.length + 1) % wots.memos.length;
				displaySensorData(memo_id);
			});

			// call function that queries for the address at regular times
			console.log("Start connection status updates");
			updateConnectionState();

			// set up bluetooth connection
			//console.log("Set up bluetooth connection");
			//ble.init();
			reinitializeBluetooth();

		});

		updateConnectionStatus = function(result) {
			if (result) {
				console.log("Result connection status: " + result.isConnected);
				wots.isConnected = result.isConnected;
			}
		};

		updateConnectionState = function() {
			if (!wots.platform) {
				return;
			}
			console.log("Query bluetooth address");
			var address = ble.getAddress();
			if (!address) {
				$('#connection').text('Geen magneet in de buurt');
			} else {
				$('#connection').text('Magneet ' + address + ' gevonden');
				if (wots.address === address) {
					//console.log("Address is already known");
				} else {
					wots.address = address;
					wots.updateAddress = true;
				}
			}

			if (wots.updateAddress) {
				csStart(csCreateSession, wots.email, wots.password);
				wots.updateAddress = false;
			}

			// should of course be replaced by more energy-efficient solution, checks now bluntly every 3s
			setTimeout(function pollConnectionState() {
				updateConnectionState();
			}, 3000); 
		};

		reinitializeBluetooth = function() {
			if (!wots.platform) {
				return;
			}
			if (!wots.address) {
				console.log("Set up bluetooth connection");
				ble.init();
			} else if (!wots.isConnected) {
				ble.reconnect();
			}
			ble.isConnected(updateConnectionStatus);

			setTimeout(function() {
				reinitializeBluetooth();
			}, 30000);
		}

		$('#virtualMemoPage').on('pageshow',function(e,data) { 
			if (!wots.email || !wots.password) {
				console.log('Email or password are not available.');
				accountDB(loginUser);
				//registerPage();
				return;
			}
			csStart(csCreateSession, wots.email, wots.password);
		});

		loginUser = function() {
			if (!wots.email || !wots.password) {
				registerPage();
				return;
			}
			csStart(csCreateSession, wots.email, wots.password);
		}

		setMemoColor = function(color) {
			if (!color) {
				// default color is yellow
				color='ffff00';
			}
			$('#memoNote').data('memo-color', color);
			$('#memoNote').css('background', '#' + color);
			$('#memoNote').css('border-top', '60px solid #' + color);
			var inc0 = 0, inc1 = 0;
			for (var c = 0; c < color.length; c+=2) {
				var z = color.charCodeAt(c) - 48;
				if (!z) {
					// detected a zero, let apply gradient to this part
					var shift = (color.length-2 - c) * 4;
					inc0 = 100 << shift;
					inc1 = 200 << shift;
					console.log("Shift is: " + shift + ", color.length: " + color.length + ", c:" + c );
					break;
				}
			}
			var nr = parseInt(color, 16);
			var grad0 = (nr+inc0).toString(16);
			var grad1 = (nr+inc1).toString(16);
			console.log("Apply gradients from: " + grad0 + " to " + grad1);
			$('#memoNote').css('background', 'linear-gradient(-45deg, #' + grad0 + ' 77%,#' + grad1 + ' 100%)');
			// exception for dark blue
			if (nr == parseInt("0000ff", 16)) {
				console.log("Set font color to white");
				$('#memoNote').css('color', 'white');
			} else {
				$('#memoNote').css('color', 'black');
			}	
		};

		/*******************************************************************************************************
		 * Success / failure pages
		 ******************************************************************************************************/

		congratsPage = function() {	
			console.log("Go to the congrats page");
			$.mobile.changePage("#congratsPage", {transition:'none', hashChange:true});
		};

		$('#congratsPage').on('pagecreate',function(e,data) { 
			console.log("Show congratulations");
			$('#congratsPageMain').css('background-image', 'url(css/images/congrats.png)' );
			var congratsHeader = "<h1>Gefeliciteerd!</h1>";
			$('#congratsHeader').empty().append(congratsHeader);
			var congratsText = "Je hebt de route succesvol afgelegd.</br></br>Je mag de standhouder nu om de Virtuele Memo vragen!";
			$('#congratsText').empty().append(congratsText);
			var btn= $('<input type="button" class="bottomButton" value="ga verder"/>');
			btn.on('click', function(event) {
				guideHomePage();
			});
			var center = $('<div id="toHomeGuideButton" align="center"></div>');
			$('#congratsBottom').append(center);
			center.append(btn);
		});

		/*******************************************************************************************************
		 * The functionality to manage all memos
		 ******************************************************************************************************/

		memoOverviewPage = function() {
			console.log("Memo overview page. Register new user, or adapt user registration details");
			$.mobile.changePage("#memoOverviewPage", {transition:'slide', hashChange:true});
		}

		$('#memoOverviewPage').on('swiperight', function(event) {
			$('#virtualMemoPanel').panel("open");
		});

		/*******************************************************************************************************
		 * The functionality to communicate over Bluetooth Low-Energy
		 ******************************************************************************************************/

		// coupling with a button is simple through an on-click event through jQuery
		$('#sendAlert').on('click', function(event) {
			console.log('Send alert from the GUI');
			ble.writeAlertLevel("high");
			setTimeout(function stopAlert() {
				ble.writeAlertLevel("low");
			}, 5000); 
		});

		/*******************************************************************************************************
		 * The guide that explains the treasure hunt on the WOTS conference
		 ******************************************************************************************************/

		guidePage = function() {
			console.log("Guide page. Should be shown only once");
			$.mobile.changePage("#guideMemo", {transition:'slide', hashChange:true});
		}

		$('#guideMemo').on('pagecreate', function() {
			console.log("Create first guide page");
			$.getJSON('data/guide.js', function(data) {
				wots.guide = data;
				wots.guideSubPageCnt = 3;
				console.log("Create status bar");
				for (var i = 0; i < wots.guideSubPageCnt; i++) {
					//console.log("Create status bar item " + i);
					var $li = $('<li/>', {'class': 'guideSubPageBtn pageDisabled', 'id': i});
					$li.on('click', function(event) {
						id=$(this).attr ( "id" );
						guideSubPage(id);
					});
					$(guideStatusBar).append($li);
				}
				guideSubPage(0);
			});
		});

		$('#guideMemo').on('swipeleft', function() {
			// get first disabled button, if no disabled buttons left, cp becomes undefined
			var np = $('.guideSubPageBtn.pageDisabled').attr('id');
			if (!np) {
				registerPage();
			} else {
				var page = parseInt(np);
				console.log("Go to page" + page);
				guideSubPage(page);
			}
		});

		$('#guideMemo').on('swiperight', function() {
			var cp = $('.guideSubPageBtn.pageEnabled').last().attr('id');
			var page = parseInt(cp);
			if (page != 0) {
				page--;	
				console.log("Go to page" + page);
				guideSubPage(page);
			}
		});

		guideSubPage = function(p) {
			if (!p) {
				p = 0;
			}
			console.log("Go to page " + p);
			var page = parseInt(p);
			switch(page) {
				case 0: $('#guideSubPage').css('background-image', 'url(css/images/Route.png)' );
					$('.guideSubPageBtn#' + page).removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideSubPageBtn#1').removeClass('pageEnabled').addClass('pageDisabled');
					$('.guideSubPageBtn#2').removeClass('pageEnabled').addClass('pageDisabled');
					var explanation = $('<p/>').text(wots.guide[page].description);
					$('#guideExplanation').empty().append(explanation);
					break;
				case 1: $('#guideSubPage').css('background-image', 'url(css/images/RouteVisited.png)' );
					$('.guideSubPageBtn#0').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideSubPageBtn#' + page).removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideSubPageBtn#2').removeClass('pageEnabled').addClass('pageDisabled');
					var explanation = $('<p/>').text(wots.guide[page].description);
					$('#guideExplanation').empty().append(explanation);
					break;
				case 2: $('#guideSubPage').css('background-image', 'url(css/images/RouteGift.png)' );
					$('.guideSubPageBtn#0').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideSubPageBtn#1').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideSubPageBtn#' + page).removeClass('pageDisabled').addClass('pageEnabled');
					var explanation = $('<p/>').text(wots.guide[page].description);
					$('#guideExplanation').empty().append(explanation);
					var btn= $('<input type="button" class="bottomButton" value="start nu"/>');
					btn.on('click', function(event) {
						registerPage();
					});
					var center = $('<div id="explanationButton" align="center"></div>');
					$('#guideExplanation').append(center);
					center.append(btn);
					break;
				default: 
					console.log('Outside of page bounds');
			}

		}

		/*******************************************************************************************************
		 * Guide for how to use the app at home
		 ******************************************************************************************************/

		guideHomePage = function() {
			console.log("Guide page. Should be shown only once");
			$.mobile.changePage("#guideHomeMemo", {transition:'slide', hashChange:true});
		}

		$('#guideHomeMemo').on('pagecreate', function() {
			console.log("Create first guideHome page");
			$.getJSON('data/guideHome.js', function(data) {
				wots.guideHome = data;
				wots.guideHomeSubPageCnt = 3;
				console.log("Create status bar");
				for (var i = 0; i < wots.guideHomeSubPageCnt; i++) {
					//console.log("Create status bar item " + i);
					var $li = $('<li/>', {'class': 'guideHomeSubPageBtn pageDisabled', 'id': i});
					$li.on('click', function(event) {
						id=$(this).attr ( "id" );
						guideHomeSubPage(id);
					});
					$(guideHomeStatusBar).append($li);
				}
				guideHomeSubPage(0);
			});
		});

		$('#guideHomeMemo').on('swipeleft', function() {
			// get first disabled button, if no disabled buttons left, cp becomes undefined
			var np = $('.guideHomeSubPageBtn.pageDisabled').attr('id');
			if (!np) {
				registerPage();
			} else {
				var page = parseInt(np);
				console.log("Go to page" + page);
				guideHomeSubPage(page);
			}
		});

		$('#guideHomeMemo').on('swiperight', function() {
			var cp = $('.guideHomeSubPageBtn.pageEnabled').last().attr('id');
			var page = parseInt(cp);
			if (page != 0) {
				page--;	
				console.log("Go to page" + page);
				guideHomeSubPage(page);
			}
		});

		guideHomeSubPage = function(p) {
			if (!p) {
				p = 0;
			}
			console.log("Go to page " + p);
			var page = parseInt(p);
			switch(page) {
				case 0: $('#guideHomeSubPage').css('background-image', 'url(css/images/guidehome_page0.png)' );
					$('.guideHomeSubPageBtn#' + page).removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#1').removeClass('pageEnabled').addClass('pageDisabled');
					$('.guideHomeSubPageBtn#2').removeClass('pageEnabled').addClass('pageDisabled');
					var explanation = $('<p/>').text(wots.guideHome[page].description);
					$('#guideHomeExplanation').empty().append(explanation);
					break;
				case 1: $('#guideHomeSubPage').css('background-image', 'url(css/images/guidehome_page1.png)' );
					$('.guideHomeSubPageBtn#0').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#' + page).removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#2').removeClass('pageEnabled').addClass('pageDisabled');
					var explanation = $('<p/>').text(wots.guideHome[page].description);
					$('#guideHomeExplanation').empty().append(explanation);
					break;
				case 2: $('#guideHomeSubPage').css('background-image', 'url(css/images/guidehome_page2.png)' );
					$('.guideHomeSubPageBtn#0').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#1').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#' + page).removeClass('pageDisabled').addClass('pageEnabled');
					var explanation = $('<p/>').text(wots.guideHome[page].description);
					$('#guideHomeExplanation').empty().append(explanation);
					var btn= $('<input type="button" class="bottomButton" value="eerste memo"/>');
					btn.on('click', function(event) {
						memoPage();
					});
					var center = $('<div id="explanationButton" align="center"></div>');
					$('#guideHomeExplanation').append(center);
					center.append(btn);
					break;
				default: 
					console.log('Outside of page bounds');
			}

		}

		/*******************************************************************************************************
		 * Register procedure for the user for the WOTS conference, required for the treasure hunt
		 ******************************************************************************************************/

		$('#registerPage').on('pagecreate', function() {
			console.log("Create register page");

			var registerText = "Registreer jezelf, zodat je later deze applicatie ook thuis kan gebruiken!";
			var explanation = $('<p/>').text(registerText);
			$('#registerExplanation').empty().append(explanation);
			var btnText = "registreer";
			var btn= $('<input type="button" class="bottomButton" value="' + btnText + '"/>');
			btn.on('click', function(event) {
				registerUser();
			});

			var center = $('<div id="explanationButton" align="center"></div>');
			$('#registerExplanation').append(center);
			center.append(btn);

			// make sure we can enter our way through the entry fields
			$('#username').keyup( function(event) {
				if (event.keyCode == 13) {
					$("#password").focus();
				}
			});
			$('#password').keyup( function(event) {
				if (event.keyCode == 13) {
					$("#email").focus();
				}
			});
			$('#email').keyup( function(event) {
				if (event.keyCode == 13) {
					$("#participantcode").focus();
				}
			});
			$('#participantcode').keyup( function(event) {
				if (event.keyCode == 13) {
					$('.bottomButton').click();
				}
			});
			$("#username").focus();

			// check if account already exists in database
			accountDB();
		});

		/*
		 * Login as user.  
		 */
		registerUser = function() {
			var username = $('#username').val();
			console.log("User \"" + username + "\" logging in");
			var email = $('#email').val();
			var password_unhashed = $('#password').val();
			var password = CryptoJS.MD5(password_unhashed).toString();
			var participantCode = $('#participantcode').val();
			participantCode = participantCode.toUpperCase();

			// create common sense session
			csStart(csCreateSession, wots.email, wots.password);
			if (interpretCode(participantCode)) {
				wots.participantCode = participantCode;
				registerNow(username, password, email, participantCode);
			}
		}

		$('#registerPage').on('swipeleft', function() {
			calcRoutePage();
		});

		$('#registerPage').on('swiperight', function() {
			$.mobile.changePage("#guideMemo", {transition:'slide', hashChange:true});
			var lastPage = wots.guideSubPageCnt - 1;
			guideSubPage(lastPage);
		});


		// check the participant code 
		interpretCode = function(participantCode) {
			if (!participantCode) {
				console.log("Error: no participantCode in function's argument");
				return false;
			}

			console.log("Check participantCode: " + participantCode);
			if (participantCode.length != 14) {
				var msg = "Code should be 14 tokens, but is " + participantCode.length;
				wrongCodeAlert(msg);
				return false;
			}

			for (var c = 0; c < 6; ++c) {
				var loc = c*2+3;
				var letter = participantCode[loc];
				var ascii = letter.charCodeAt(0) - 65 + 10; // 'A' = 65, cast to numeric '10'
				//console.log("Letter " + letter + " becomes " + ascii);
				if (ascii < 10 || ascii > 36) {
					wrongCodeAlert('Incorrect symbol at location ' + loc + '!');
					return false;
				}
				wots.route[c] = letter;
				//console.log('Added to the route stand "' + wots.route[c] + '"');
			}
			for (var c = 0; c < 5; ++c) {
				var loc = c*2+4;
				var letter = participantCode[loc];
				var ascii = letter.charCodeAt(0) - 48;
				//console.log("Number " + letter + " becomes " + ascii);
				if (ascii < 0 || ascii > 9) {
					wrongCodeAlert('Incorrect symbol at location ' + loc + '!');
					return false;
				}
			}

			if (wots.route.length != 6) {
				console.log("Route should have had 6 stops, but has " + wots.route.length);
				return false;
			}
			return true;	
		}

		// check the password
		checkPasscode = function(letter, passcode) {
			if (wots.participantCode.length != 14) {
				console.log("Participant code is not of length 14");
				return false
			} else {
				console.log("Participant code is: " + wots.participantCode);
			}
			if (passcode.length != 4) {
				var msg = "Passcode is not of length 4";
				wrongCodeAlert(msg);
				return false;
			}
			var ascii = letter.charCodeAt(0) - 65 + 10;
			//	console.log("Stand letter " + letter + " becomes " + ascii);
			var blue = wots.participantCode[10].charCodeAt(0) - 48;
			var red = wots.participantCode[12].charCodeAt(0) - 48;
			var SSBR = ascii * 100 + blue * 10 + red;
			//	console.log("SSBR code becomes: " + SSBR); 
			var expPincode = (SSBR * 16981) % 10000;

			var pincode = 0;
			for (var p = 0; p < 4; ++p) {
				var dp = passcode.charCodeAt(p) - 48;
				pincode *= 10;
				pincode += dp;
			}
			if (pincode != expPincode) {
				var msg = "Help! Pincode " + pincode + " is incorrect";
				wrongCodeAlert(msg);
				console.log("Help! " + pincode + " should have been " + expPincode);
				return false;
			} else {
				console.log("Yes! Pincode was correct. Now check checksum");
			}

			// now do a checksum
			var expChecksum = 0;
			for (var c = 0; c < 3; ++c) {
				var loc = c*2+4;
				var letter = wots.participantCode[loc];
				var dn = letter.charCodeAt(0) - 48;
				expChecksum *= 10;
				expChecksum += dn;
			}
			console.log("Expected checksum is: " + expChecksum);

			var insanely_large_number = 0;
			for (var c = 0; c < 14; ++c) {
				if ((c == 2) || (c == 4) || (c==6) || (c==8)) continue; //exclude checksum and underscore
				var ascii = 0;
				if (c && !(c % 2)) { // even, but excluding c==0 (so all numbers)
					ascii = wots.participantCode[c].charCodeAt(0) - 48;
				} else { // odd (so, all letters)
					ascii = wots.participantCode[c].charCodeAt(0) - 65 + 10;
				}
				insanely_large_number *= 10;
				insanely_large_number += ascii;
			}
			console.log("The insanely large number became:" + insanely_large_number);
			var checksum = insanely_large_number % 997;
			console.log("Calculated checksum: " + checksum);

			if (checksum != expChecksum) {
				var msg = "Help checksums do not match";
				wrongCodeAlert(msg);
				//				console.log("Help! checksums do not match");
				return false;
			}
			console.log("Checksum was correct!");
			return true;
		}

		registerNow = function(username, password, email, participantCode) {
			console.log("Register " + username + " with email address " + email);
			wots.username = username;
			wots.password = password;
			wots.email = email;
			wots.participantCode = participantCode;
			console.log("Registered... Password: " + wots.password);
			console.log("Registered... Email: " + wots.email);
			accountDB(wots.afterRegistration);
		}

		/*******************************************************************************************************
		 * General local database functions
		 ******************************************************************************************************/

		errorCB = function(tx, err) {
			console.log("Error processing SQL:", err);
		}

		successCB = function() {
			console.log("Successful SQL query");
		}

		/*******************************************************************************************************
		 * Get account data from the local database
		 ******************************************************************************************************/

		accountDB = function(callback) {
			if (!wots.db) {
				wots.db = window.openDatabase("memo", "1.0", "Memo", 1000000);
				localdb.init(wots.db);
			}
			if (testing) {
				localdb.deleteUsers();
			}
			localdb.createUsers();
			console.log("Get user");
			localdb.getUser(userObtained, callback);
		}

		userObtained = function(errcode, result, callback) {
			var updateDB = false;
			if (errcode) {
				// there is no user in the database...
				console.log("There is no user in the database");
				updateDB = true;
			} else {
				updateDB = updateMemUser(result);
			}

			if (updateDB) {
				// update database with new user information
				console.log("Update user with new user information");
				localdb.deleteUsers(function createUsers() {
					localdb.createUsers(function createUser() {
						var user = {
							'username': wots.username,
						'password': wots.password,
						'email': wots.email,
						'code': wots.participantCode
						}
						console.log("Create user: ", user); 
						localdb.createUser(wots.username, wots.password, wots.email, 
								wots.participantCode, function displayUser() {
							displayUserData();
							if (callback && typeof(callback) === "function") {
								console.log("Go on after obtaining user");
								callback();
							}
						});
					});
				});
			} else {
				// user is already correctly stored in database...
				console.log("User is already stored in the database");
				if (callback && typeof(callback) === "function") {
					console.log("Go on after obtaining user");
					callback();
				}
			}
		}

		updateMemUser = function(user) {
			if (!user) {
				console.log("Error: user is undefined");
				return;
			}
			var updated = false;
			// get result
			wots.username = wots.username || user.name;
			wots.password = wots.password || user.password;
			wots.email = wots.email || user.email;
			wots.participantCode = wots.participantCode || user.code;

			// check if anything changed				
			updated = updated || (wots.username && (wots.username != user.name));
			updated = updated || (wots.password && (wots.password != user.password));
			updated = updated || (wots.email && (wots.email != user.email));
			updated = updated || (wots.participantCode && (wots.participantCode != user.code));
			if (updated) {
				console.log("Updated user data from the database");
			} else {
				console.log("User data does not need updated from the database");
			}
			return updated;
		}

		displayUserData = function() {
			$('#username').val(wots.username);
			//$('#password').val(wots.password); don't do that, we have only md5 hash anyway
			$('#email').val(wots.email);
			$('#participantcode').val(wots.participantCode);
		}

		/*******************************************************************************************************
		 * Get stand data from the local database
		 ******************************************************************************************************/

		standsDB = function(callback) {
			console.log("Get stands from database");
			if (!wots.db) {
				wots.db = window.openDatabase("memo", "1.0", "Memo", 1000000);
				localdb.init(wots.db);
			}

			if (typeof(callback) == "function") {
				wots.db.transaction(queryStandsDB, errorCB, callback);
			} else {
				wots.db.transaction(queryStandsDB, errorCB);
			}
		}

		/**
		 * Create new database table if it does not exist yet, and query or create the stand owner information.
		 */
		queryStandsDB = function(tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS STANDS (id, status)');
			tx.executeSql('SELECT * FROM STANDS', [], queryStandsSuccess, errorCB);
		}

		/**
		 * Iterate through all stand owners in the wots.exhibitors list and in the local database. Find the 
		 * stand owners that match. If the stand owner exists, update the status from the database to the local
		 * wots.exhibitors array. If the stand owner does not exist, add it to the database. 
		 *
		 * To update a status field in the database, use standsUpdateDB().
		 */
		queryStandsSuccess = function(tx, results) {
			var len = results.rows.length;
			console.log("Number of stand owners in the database: " + len);
			if (results.rowsAffected) return false;

			// iterate through all exhibitors, and if not present, create entry in table
			for (var c = 0; c < wots.exhibitors.length; c++) {

				var id = wots.exhibitors[c].id;

				var found = false;
				for (var i=0; i<len; i++) {
					//console.log("Find stand holder " + id);
					if (results.rows.item(i).id == id) {
						wots.exhibitors[c].status = results.rows.item(i).status;
						found = true;
						break;
					}
				}
				if (!found) {
					//console.log("Add stand holder " + id);
					wots.exhibitors[c].status = 'undefined';
					var status = wots.exhibitors[c].status;
					//console.log("With status: " + status); 
					tx.executeSql('INSERT INTO STANDS (id, status) VALUES ("' + id + '","' + 
								status + '")');
				}
			}
			return true;
		}

		standsUpdateDB = function(callback) {
			if (!wots.db) {
				wots.db = window.openDatabase("memo", "1.0", "Memo", 1000000);
				localdb.init(wots.db);
			}

			if (typeof(callback) == "function") {
				wots.db.transaction(queryStandsUpdateStatus, errorCB, callback);
			} else {
				wots.db.transaction(queryStandsUpdateStatus, errorCB);
			}
		}

		/*
		 * Write new value to the "status" field of a stand owner in the local database.
		 */
		queryStandsUpdateStatus = function(tx, results) {
			var exhibitor = wots.exhibitorsById[wots.selectedExhibitorId];
			if (!exhibitor) return false;

			var id = exhibitor.id;
			var status = exhibitor.status;
			tx.executeSql('UPDATE STANDS SET status="' + status + '" WHERE id="' + id + '"');
			return true;
		}

		/*******************************************************************************************************
		 * Get note data from the local database
		 ******************************************************************************************************/

		noteDB = function() {
			if (!wots.db) {
				wots.db = window.openDatabase("memo", "1.0", "Memo", 1000000);
				localdb.init(wots.db);
			}
			var sensor_id = getSensor();
			if (sensor_id) {
				// get specific memo out of database
				console.log("Get sensor out of database using sensor_id");
				localdb.existMemo(sensor_id, sensorKnown);
			} else {
				// get most recent memo out local database
				console.log("Get sensor out of database without knowing sensor_id");
				localdb.getMemo(sensorUnknown);
			}
		}

		getSensor = function() {
			return wots.sensor_id;
		}

		setSensor = function(sensor_id) {
			wots.sensor_id = sensor_id;
		}

		sensorUnknown = function(errcode, result) {
			if (errcode) {
				if (result) {
					console.error(result);
				}
				// create sensor and call the noteDB function again
				console.log("No sensor found, we will create one");
				var index = 0;
				csExistSensor(index, function() { 
					console.log("Memo is present");	
				},
				function() {
					console.log("Create memo if not yet present in CommonSense");
					//csGetSensorData();
					csCreateSensorData();
				})
				return;
			}
			console.log("Result (should be sensor_id) " + result);
			wots.sensor_id = result;

			// next step! create sensor data
			updateSensorData();
		}

		sensorKnown = function(errcode, result) {
			if (errcode) {
				if (!getSensor()) {
					console.log("Do not call this function if sensor id is not known");
					return;
				}
				console.log("Error: " + errcode);
				if (errcode == localdb.ERR_EMPTY_TABLE || errcode == localdb.ERR_GENERAL) {
					if (!wots.sensor_id) {
						console.error("Mmmm... we should have a sensor id here");
						return;
					}
					localdb.createMemos();
					// create memo in database and call noteDB function again
					console.log("Create memo with id " + wots.sensor_id + " in local database");
					localdb.createMemo(wots.sensor_id, noteDB);
				} else if (errcode == localdb.ERR_COMPARE) {
					// just add memo, although there is already one there, perhaps person deleted it
					// in the commonsense database
					console.log("Create new memo in local database");
					localdb.createMemo(wots.sensor_id, noteDB);
				}
				return;
			}
			// we have a correct sensor id, now store data
			console.log("Result (should be sensor_id) " + result);
			setSensor(result);

			// next step! create sensor data
			updateSensorData();
		}

		updateSensorData = function() {
			console.log("Load sensor data");
			loadSensorData();

			var index = 0;
			csExistSensor(index, function() { 
				console.log("Memo is present");	
			},
			function() {
				console.log("Create memo if not yet present in CommonSense");
				//csGetSensorData();
				csCreateSensorData();
			})
		}

		queryNoteDB = function(tx) {
			if (testing) {
				tx.executeSql('DROP TABLE IF EXISTS NOTES');
			}
			tx.executeSql('CREATE TABLE IF NOT EXISTS NOTES (sensor_id)');
			tx.executeSql('SELECT * FROM NOTES', [], queryNoteSuccess, errorCB);
		}

		queryNoteSuccess = function(tx, results) {
			var len = results.rows.length;
			if (!results.rowsAffected) {
				if (!len) {
					console.log("Sensor id is not stored in local database yet");
					if (wots.sensor_id) {
						console.log("Store it");
						tx.executeSql('INSERT INTO NOTES (sensor_id) VALUES ("' 
									+ wots.sensor_id + '")');
						return true;
					}
					console.log("And it was not obtained from CommonSense either");
					return false;
				}
				var i = len-1; // most recent added entry, if there are more which shouldn't be the case
				wots.sensor_id = results.rows.item(i).sensor_id;
				console.log("Retrieved sensor id: " + wots.sensor_id);
				return true;
			}
		}

		/*******************************************************************************************************
		 * Shortcuts for calling specific pages
		 ******************************************************************************************************/

		registerPage = function() {
			console.log("Registration page. Register new user, or adapt user registration details");
			$.mobile.changePage("#registerPage", {transition:'slide', hashChange:true});
		}

		calcRoutePage = function() {
			console.log("Go to calculating route page");
			wots.calculated = false;
			$.mobile.changePage("#calculatingPage", {transition:'slide', hashChange:true});
		}

		wotsPage = function() {
			console.log("Go to main page for WOTS during exhibitor list");
			$.mobile.changePage("#exhibitorListPage", {transition:'slide', hashChange:true});
		}

		checkWotsPasscode = function(code) {
			if (!code) {
				console.log("There is no code entered");
				return;
			}
			if (code.length != 4) {
				wrongCodeAlert("The passcode should have 4 numbers");
				return;
			}
			wots.passcode = code;
			var exhibitor = wots.exhibitorsById[wots.selectedExhibitorId];
			console.log("Select exhibitor", exhibitor);
			var letter = exhibitor.standletter;
			console.log(" with stand letter ", letter);
			var success = checkPasscode(letter, wots.passcode);
			if (success) {
				// clear code
				$('#passcode').val('');
				// update status and go back to main screen
				console.log("Update status of " + exhibitor.name + " as fulfilled");
				exhibitor.status = "done";
				standsUpdateDB();
				wotsPage();
			}

		}

		$('#calculatingPage').on('pagecreate', function() {
			console.log("Create calculating page");
			var img_src = "css/images/CalculatingRoute.png";
			var center = $('<div align="center"></div>');
			var calc = $('#calculating');
			calc.append(center);
			center.append($('<img>', {
				src: img_src
			}));
			var text = $('<p>').text("Er wordt nu een route berekend die u langs zes standhouders voert.");
			center.append(text);
		});

		$('#calculatingPage').on('pageshow', function() {
			if (wots.calculated) return;
			var timeoutMillis = 1500;
			console.log("Wait " + timeoutMillis + " msec and move on to the WOTS page");
			setTimeout( wotsPage, timeoutMillis );
			wots.calculated = true;
		});

		/*******************************************************************************************************
		 * Communication with the CommonSense database
		 ******************************************************************************************************/

		csSuccessCB = function(response) {
			console.log("Successful CommonSense call: " + response);
		}

		csErrorCB = function(response) {
			console.log("Error in CommonSense call: " + response);
		}

		/**
		 * The starting point.
		 * @param call  function csCreateUser or csCreateSession which accepts (email, password) as arguments.
		 */
		csStart = function(call, email, password) {
			sense.checkServer(function(response) {
				if (response.online) {
					call(email, password);
				} else {
					console.error(response.msg);
				}
			});
		}

		/**
		 * There are basically two options. Either the user already exists in the CommonSense database, or the
		 * user does not exist. In the latter case, we will have to create a user given the data handed to us.
		 *
		 * Here we pull a trick. We do not actually use the email and password of the user, but we generate one
		 * from the memo-id. This makes it easy for other people that use the same memo to log into it. Only
		 * people that know the physical id of the memo (so people that are close to the place where the memo
		 * resides) can read the content. This is not so different from actual physical memo notes.
		 */
		csCreateUser = function(email, password) {
			if (device_as_user) {
				var account = loginAsDevice();
				if (account) {
					var user = {
						"user": {
							"email": account.email,
							"username": account.email,
							"name": "",
							"surname": "",
							"mobile": "",
							"password": account.password
						}
					}
					console.log("Change username to " + account.email + " and password to " + account.password);
					sense.createUser(user, createUserSuccessCB, generalErrorCB);
				} else {
					console.log("Session with database could not be set up. Device is not yet connected");
				}
			} else {
				var user = {
					"user": {
						"email": email,
						"username": email,
						"name": "",
						"surname": "",
						"mobile": "",
						"password": password
					}
				}
				sense.createUser(user, createUserSuccessCB, generalErrorCB);
			}
		};

		/**
		 * In case the user already exists in the CommonSense database, we only need to create a session with 
		 * the user credentials that are already locally stored.
		 */
		csCreateSession = function(email, password) {
			if (device_as_user) {
				var account = loginAsDevice();
				if (account) {
					console.log("Change username to " + account.email + " and password to " + account.password);
					sense.createSession(account.email, account.password, createSessionSuccessCB, createSessionErrorCB);
				} else {
					console.log("Session with database could not be set up. Device is not yet connected");
				}
			} else {
				console.log("Create session for user \"" + email + "\" and \"" + password + "\" with CommonSense");
				sense.createSession(email, password, createSessionSuccessCB, createSessionErrorCB);
			}
		};

		loginAsDevice = function() {
			if (!deviceAvailable()) return null;
			var email = wots.address;
			var password = 'MEMO:' + wots.address;
			password = CryptoJS.MD5(password).toString();
			return { 'email': email, 'password': password };
		}

		deviceAvailable = function() {
			if (!wots.address) {
				return false;
			}
			return true;
		}

		createSessionErrorCB = function() {
			console.log("Could not log in, try to create the user");
			csStart(csCreateUser);
		};

		createSessionSuccessCB = function(result) {
			console.log("Successfully logged in, update", result);
			updateSensor();
		};

		generalErrorCB = function(msg) {
			console.log("Error: ", msg);
		};

		createUserSuccessCB = function(result) {
			console.log(result);
			var obj = eval('(' + result + ')');
			var exists = obj && obj.user && obj.user.id;
			if (exists) {
				console.log("Created user with id: " + obj.user.id);
				// TODO: login
				//csCreateSession();
			} else {
				console.log("Could not create user");
			}
		};

		updateSensor = function() {
			console.log("Update sensor");
			noteDB();
		};

		csCreateSensor = function() {
			console.log("Create sensor");
			var sensorName = "memo"; 
			var index = 0;
			var sensorDisplayName = "Memo" + index;
			var sensorDeviceType = "nRF51822-based BLE device"; 
			var sensorDataType = "json";
			var data = {
				"sensor": 
				{
					"name": sensorName,
					"display_name": sensorDisplayName,
					"device_type": sensorDeviceType,
					"data_type": sensorDataType
				}
			}
			console.log("Data to create the CommonSense sensor ", data);
			sense.createSensor(data, csCreateSensorSuccessCB, generalErrorCB);
		};

		csCreateSensorSuccessCB = function(result) {
			console.log("Create sensor result", result);
			// it is much safer to use a JSON parser, but for the purpose of example code:
			var obj = eval('(' + result + ')');
			var exists = obj && obj.sensor && obj.sensor.id;
			if (exists) {
				console.log("Set sensor id: " + obj.sensor.id);
				wots.sensor_id = obj.sensor.id;
				noteDB();
			} else {
				console.log("Response couldn't be parsed or does not have sensor id field");
			}
		};

		csExistSensor = function(index, successCB, errorCB) {
			console.log("Get sensors");
			var data = {};
			sense.sensors(data, function(result) {
				var obj = JSON.parse(result);
				var search_term = "Memo" + index;
				//console.log("Result existence: ", obj.sensors); 
				for (var i = 0; i < obj.sensors.length; i++) {
					var sensor = obj.sensors[i];
					//console.log("Sensor: ", sensor);
					if (sensor.name === "memo") {
						if (sensor.display_name === search_term) {
							console.log("Found sensor!");
							wots.sensor_id = sensor.id;
							successCB();
						} else {
							console.log("Found memo sensor, but with different id");
							console.log("Compared " + sensor.display_name + " with " + search_term);
							continue;
						}
					}	
				}
				errorCB();
			},
				generalErrorCB);			
		}
		/*
		   csGetSensors = function() {
		   console.log("Get sensors");
		   var data = {};
		   sense.sensors(data, csGetSensorsSuccessCB, generalErrorCB);
		   }

		   csGetSensorsSuccessCB = function(result) {
		   console.log("Found sensors", result);
		   }
		   */
		csCreateSensorData = function() {
			console.log("Write new memo to CommonSense database");
			if (!wots.sensor_id) {
				console.log("There is no sensor id stored");
				return;
			}
			var sensor_id = wots.sensor_id;

			var memoId = $('#memoNote').data('memo-id');
			var memoText = $('#memoText').val();
			var memoLocation = $('#memoLocation').val();
			var memoAlert = $('#memoAlert').val();
			var memoDate = $('#memoDate').val();
			var memoRepeat = $('#memoRepeat').val();
			var memoColor = $('#memoNote').data('memo-color');
			var memoAuthor = wots.username;
			var memoTitle = $('#memoTitle').val();
			var memoData = {
				"id": memoId,
				"text": memoText,
				"location": memoLocation,
				"title": memoTitle,
				"author": memoAuthor,
				"alert": memoAlert,
				"date": memoDate,
				"repeat": memoRepeat,
				"color": memoColor
			};
			var memoValue = JSON.stringify(memoData);
			var data = { 
				"data": [ 
				{
					"value": memoValue
				}
				]
			};
			console.log("Data to write to sensor " + sensor_id + " is ", data);
			sense.createSensorData(sensor_id, data, csCreateSensorDataSuccessCB, generalErrorCB);
		};

		deleteSensorData = function() {
			if (wots.memos <= 1) {
				console.log("Cannot delete last memo");
				return;
			}
			var memo_id = getCurrentMemoId();
			var memo = getCurrentMemo();
			if (!memo) return;
			var data_id = memo.id;
			var sensor_id = wots.sensor_id;
			console.log("Delete memo in CommonSense");
			sense.deleteSensorData(sensor_id, data_id, csSuccessCB, csErrorCB);
			console.log("Delete memo locally");
			wots.memos.splice(memo_id, 1);
			console.log("Move to and display next memo");
			memo_id = (memo_id + wots.memos.length + 1) % wots.memos.length;
			displaySensorData(memo_id);
		};
		/*
		   csGetSensorData = function(index) {
		   if (!wots.sensor_id) {
		   console.log("There is no sensor id stored");
		   return;
		   }
		   var sensor_id = wots.sensor_id;
		   var memo_id = getCurrentMemoId();
		   var data = {};
		   console.log("Get sensor data from CommonSense");
		   sense.sensorData(sensor_id, data, csGetSensorDataSuccessCB, generalErrorCB);
		   };

		   csGetSensorDataSuccessCB = function(result) {

		   console.log(result);
		   };
		   */
		getCurrentMemo = function() {
			var memoId = getCurrentMemoId();
			if (!wots.memos) {
				console.log("There is no memos array (yet)");
				return null;
			}
			if (memoId > wots.memos.length) {
				console.log("The current memo id is incorrect (larger than array length)");
				return null;
			}
			return wots.memos[memoId];
		};

		getCurrentMemoId = function() {
			var memoId = $('#memoNote').data('memo-id');
			return memoId;
		};

		updateCurrentMemoId = function(memoId) {
			$('#memoNote').data('memo-id', memoId);
		};

		displaySensorData = function(page) {
			if (!wots.memos) {
				console.log("There is no array of memos");
				return;
			}
			if (wots.memos.length < page) {
				console.log("Array of memos is not long enough");
				return;
			}
			updateCurrentMemoId(page);
			var sensor = wots.memos[page];
			if (!sensor) {
				console.log("There is no sensor data, drop out");
				return;
			}
			console.log(sensor);
			var memo = eval('(' + sensor.value + ')');
			console.log("Memo", memo);
			$('#memoText').val(memo.text);
			$('#memoLocation').val(memo.location);
			if (!memo.author) memo.author = 'Een onbekende';
			$('#memoAuthor').val(memo.author);
			if (!memo.title) memo.title = 'Welkom';
			$('#memoTitle').val(memo.title);
			$('#memoAlert').val(memo.alert);
			$('#memoDate').val(memo.date);
			$('#memoRepeat').val(memo.repeat);
			setMemoColor(memo.color);
		}

		csCreateSensorDataSuccessCB = function(result) {
			if (!result) {
				//console.log("Adding sensor data should not result in a response, so this is fine");
				return;
			}
			console.log("Error?", result);
		};

		loadSensorData = function() {
			var param = {};
			var sensor_id = wots.sensor_id;
			if (!sensor_id) {
				console.log("Currently sensor id is not set yet, cannot load data");
				return;
			}
			sense.sensorData(sensor_id, param, loadSensorDataSuccessCB, generalErrorCB);
		};

		loadSensorDataSuccessCB = function(result) {
			if (!result) {
				console.log("Error: no data returned, while it stated to be successful...");
				return;
			}
			//console.log("Received results", result);

			// fill array with memo's
			var obj = eval('(' + result + ')');
			console.log("Store array", obj);

			if (!obj.data) {
				console.log("Memo array should be wrapped into a data field");
				return;
			}

			wots.memos = obj.data;

			if (!wots.memos) {
				console.log("Huh, memo object is empty");
				return;
			}
			console.log("Loaded " + wots.memos.length + " memos");
		};

		/**
		 * The more normal way to cope with a device that can be shared with multiple people is to use groups. 
		 * However, also this doesn't work in CommonSense. There is no easy way to add information to someone's
		 * else sensor.
		 */

		// Start the application automatically
		start();	
	}
}

