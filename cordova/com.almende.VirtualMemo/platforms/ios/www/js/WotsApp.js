function WotsApp() {

	/**************************************************************************************************************
	 * Fields that we use in the WOTS application
	 *************************************************************************************************************/

	this.exhibitors = [];
	this.exhibitorsById = {};
	this.route = [];
	this.selectedExhibitorId = null;
	this.guide = [];
	this.guidePageCnt = 0;
	this.username = "";
	this.email = "";
	this.db = null;
	this.participantCode = "";
	this.password = "";
	this.passcode = "";
	this.calculated = false;
	this.memos = [];
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

		//var hangman = new Hangman();

		var sense = SenseAPI;

		var localdb = LocalDB;

		var crypto = CryptoJS;

		$.ajaxSetup({ cache: false });

		// very important statement to make swiping work: 
		// https://stackoverflow.com/questions/12838443/\
		//   swipe-with-jquery-mobile-1-2-phonegap-2-1-and-android-4-0-4-not-working-properl
		document.ontouchmove = function(event) {    
			event.preventDefault();
		};

		var testing = false;
		var test_sense = false;

		// at which page to start?
		start = function() {
			// should be make dependent on content in the database
			console.log("Started the WOTS application");
			$.mobile.changePage("#virtualMemoPage", {transition:'none', hashChange:true});
		}


		/**********************************************************************************************************************
		 * The list of exhibitors
		 *********************************************************************************************************************/

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
				alert("We don't have the right participantCode available, sorry you have to enter it again!");
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
			var nextNextExhibitor = null;
			var pastSomeDone = false;
			for (var c = 0; c < wots.exhibitors.length; c++) {
				var exhibitor = wots.exhibitors[c];
				if (typeof exhibitor.status == 'undefined') {
					exhibitor.status = "open";
				}
				if (typeof exhibitor.oneliner == 'undefined') {
					exhibitor.oneliner = '';
				}
			}
			for (var r = 0; r < wots.route.length; r++) {
				//			var onRoute = false;
				var exhibitor;
				for (var c = 0; c < wots.exhibitors.length; c++) {
					exhibitor = wots.exhibitors[c];
					//					console.log("Is stand " + exhibitor.standletter + " on the route?");
					if (wots.route[r] == exhibitor.standletter) {
						console.log("Found exhibitor", exhibitor);
						//						onRoute = true;
						break;
					}
				}
				// skip to next exhibitor if not on route
				//				if (!onRoute) continue;

				wots.exhibitorsById[exhibitor.id] = exhibitor;
				if (c + 1 < wots.exhibitors.length) {
					nextExhibitor = wots.exhibitors[c + 1];
				} else {
					nextExhibitor = null;
				}
				if (c + 2 < wots.exhibitors.length) {
					nextNextExhibitor = wots.exhibitors[c + 2];
				} else {
					nextNextExhibitor = null;
				}
				var doneClass = "";
				var enabledClass = "taskDisabled";
				//		var enabledClass = "taskEnabled";
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
					//					if(pastSomeDone || nextExhibitor && nextExhibitor.status == "done")
					//						enabledClass = "taskEnabled";
					//					else {
					//						if(nextNextExhibitor && nextNextExhibitor.status == "done")
					//							enabledClass = "taskHalfEnabled";
					//					}
					if (prevExhibitor && prevExhibitor.status == "done") 
						enabledClass = "taskEnabled";
					if (!prevExhibitor) 
						enabledClass = "taskEnabled";
				}
				$(exhibitorList)
					.append($('<li/>', { "class":doneClass + ' ' + enabledClass })
							.append($('<a/>', {
								'href':'#exhibitorDetailsPage',
							'data-transition':'slide',
							'data-id':exhibitor.id
							})
								.append('<span>' + exhibitor.name + '</span>')
								.append('<p>' + exhibitor.oneliner + '</p>')
							       )
					       );
				prevExhibitor = exhibitor;
			} // End for-loop
			$('#exhibitorList').listview('refresh');
		}

		$('#exhibitorList').on('click', 'li a', function(event) {
			wots.selectedExhibitorId = $(this).attr('data-id');
			$.mobile.changePage("#exhibitorDetailsPage", {transition:'slide', hashChange:true});
			event.preventDefault();
		});

		/**********************************************************************************************************************
		 * The individual exhibitor has a detailed page, where a code needs to be filled in
		 *********************************************************************************************************************/

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
						//generateHangman(exhibitor.activeQuestion.type, exhibitor.activeQuestion.length);
						/*
						var fixedLength = 4;
						hangman.generateHangman(fixedLength);
						*/
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

		/**********************************************************************************************************************
		 * The functionality around the memo notes
		 *********************************************************************************************************************/

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

			// set up bluetooth connection
			ble.init();
		});

		$('#virtualMemoPage').on('pageshow',function(e,data) { 
			if (!wots.email || !wots.password) {
				console.log('Email or password are not available. Go to registration page');
				registerPage();
				return;
			}
			createSession(wots.email, wots.password);
		});

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

		/**********************************************************************************************************************
		 * The functionality to communicate over Bluetooth Low-Energy
		 *********************************************************************************************************************/

		// coupling with a button is simple through an on-click event through jQuery
		$('#sendAlert').on('click', function(event) {
			console.log('Click event received');
			ble.readLinkLoss();
		});

		/**********************************************************************************************************************
		 * The guide that explains the treasure hunt on the WOTS conference
		 *********************************************************************************************************************/

		$('#guideMemo').on('pagecreate', function() {
			console.log("Create first guide page");
			$.getJSON('data/guide.js', function(data) {
				//var exhibitorList = $('#exhibitorList');
				// store exhibitors in global variable, lost after application restart...
				wots.guide = data;
				wots.guidePageCnt = 3;
				console.log("Create status bar");
				for (var i = 0; i < wots.guidePageCnt; i++) {
					//console.log("Create status bar item " + i);
					var $li = $('<li/>', {'class': 'guidePageBtn pageDisabled', 'id': i});
					$li.on('click', function(event) {
						id=$(this).attr ( "id" );
						guidePage(id);
					});
					$(guideStatusBar).append($li);
				}
				guidePage(0);
			});
		});

		$('#guideMemo').on('swipeleft', function() {
			// get first disabled button, if no disabled buttons left, cp becomes undefined
			var np = $('.guidePageBtn.pageDisabled').attr('id');
			if (!np) {
				registerPage();
			} else {
				var page = parseInt(np);
				console.log("Go to page" + page);
				guidePage(page);
			}
		});

		$('#guideMemo').on('swiperight', function() {
			var cp = $('.guidePageBtn.pageEnabled').last().attr('id');
			var page = parseInt(cp);
			if (page != 0) {
				page--;	
				console.log("Go to page" + page);
				guidePage(page);
			}
		});

		guidePage = function(p) {
			console.log("Go to page " + p);
			var page = parseInt(p);
			switch(page) {
				case 0: $('#guidePage').css('background-image', 'url(css/images/Route.png)' );
					$('.guidePageBtn#' + page).removeClass('pageDisabled').addClass('pageEnabled');
					$('.guidePageBtn#1').removeClass('pageEnabled').addClass('pageDisabled');
					$('.guidePageBtn#2').removeClass('pageEnabled').addClass('pageDisabled');
					var explanation = $('<p/>').text(wots.guide[page].description);
					$('#guideExplanation').empty().append(explanation);
					break;
				case 1: $('#guidePage').css('background-image', 'url(css/images/RouteVisited.png)' );
					$('.guidePageBtn#0').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guidePageBtn#' + page).removeClass('pageDisabled').addClass('pageEnabled');
					$('.guidePageBtn#2').removeClass('pageEnabled').addClass('pageDisabled');
					var explanation = $('<p/>').text(wots.guide[page].description);
					$('#guideExplanation').empty().append(explanation);
					break;
				case 2: $('#guidePage').css('background-image', 'url(css/images/RouteGift.png)' );
					$('.guidePageBtn#0').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guidePageBtn#1').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guidePageBtn#' + page).removeClass('pageDisabled').addClass('pageEnabled');
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
				var username = $('#username').val();
				var email = $('#email').val();
				var password = $('#password').val();
				var participantCode = $('#participantcode').val();
				createUser(username, password);
				console.log("Make participant code upper case");
				participantCode = participantCode.toUpperCase();
				if (interpretCode(participantCode)) {
					wots.participantCode = participantCode;
					registerNow(username, password, email, participantCode);
				}
			});

			var center = $('<div id="explanationButton" align="center"></div>');
			$('#registerExplanation').append(center);
			center.append(btn);

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

		$('#registerPage').on('swipeleft', function() {
			calcRoutePage();
		});

		$('#registerPage').on('swiperight', function() {
			$.mobile.changePage("#guideMemo", {transition:'slide', hashChange:true});
			var lastPage = wots.guidePageCnt - 1;
			guidePage(lastPage);
		});
		
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

		alertCallback = function() {
		};

		// check the participant code 
		interpretCode = function(participantCode) {
			if (!participantCode) {
				console.log("Error: no participantCode in function's argument");
				return false;
				/*
				// no participantCode as argument, than try to get it
				hangman.hangman_dosubmit();
				participantCode = wots.participantCode;
				*/
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
				console.log("Letter " + letter + " becomes " + ascii);
				if (ascii < 10 || ascii > 36) {
					wrongCodeAlert('Incorrect symbol at location ' + loc + '!');
					return false;
				}
				wots.route[c] = letter;
				console.log('Added to the route stand "' + wots.route[c] + '"');
			}
			for (var c = 0; c < 5; ++c) {
				var loc = c*2+4;
				var letter = participantCode[loc];
				var ascii = letter.charCodeAt(0) - 48;
				console.log("Number " + letter + " becomes " + ascii);
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
				console.log("Passcode is not of length 4");
				return false;
			}
			var ascii = letter.charCodeAt(0) - 65 + 10;
			console.log("Stand letter " + letter + " becomes " + ascii);
			var blue = wots.participantCode[10].charCodeAt(0) - 48;
			var red = wots.participantCode[12].charCodeAt(0) - 48;
			var SSBR = ascii * 100 + blue * 10 + red;
			console.log("SSBR code becomes: " + SSBR); 
			var expPincode = (SSBR * 16981) % 10000;

			var pincode = 0;
			for (var p = 0; p < 4; ++p) {
				var dp = passcode.charCodeAt(p) - 48;
				pincode *= 10;
				pincode += dp;
			}
			if (pincode != expPincode) {
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
				console.log("Help! checksums do not match");
				return false;
			}
			console.log("Checksum was correct!");
			return true;
		}

		registerNow = function(username, password, email, participantCode) {
			console.log("Register " + username + " with email address " + email);
			wots.username = username;
			wots.password = CryptoJS.MD5(password).toString();
			wots.email = email;
			wots.participantCode = participantCode;
			console.log("Registered... Password: " + wots.password);
			console.log("Registered... Email: " + wots.email);
			accountDB(calcRoutePage);
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
			if (typeof(callback) == "function") {
				wots.db.transaction(queryAccountDB, errorCB, callback);
			} else {
				wots.db.transaction(queryAccountDB, errorCB);
			}
		}

		queryAccountDB = function(tx) {
			if (testing) {
				tx.executeSql('DROP TABLE IF EXISTS MEMO');
			}
			tx.executeSql('CREATE TABLE IF NOT EXISTS MEMO (name, password, email, code)');
			tx.executeSql('SELECT * FROM MEMO', [], queryAccountSuccess, errorCB);
		}

		queryAccountSuccess = function(tx, results) {
			var len = results.rows.length;
			if (!results.rowsAffected) {
				if (!len) {
					console.log("Nothing in database yet, write account data to it");
					// write entries to database
					tx.executeSql('INSERT INTO MEMO (name, password, email, code) VALUES ("' + 
								wots.username + '","' + wots.password + '","' + wots.email +  '","' + 
								wots.participantCode + '")');
					return false;
				}

				var i = len - 1; // most recent added entry
				wots.username = wots.username || results.rows.item(i).name;
				wots.email = wots.email || results.rows.item(i).email;
				var participantCode = results.rows.item(i).code;
				// if participantCode is different, replace it...
				// todo: same with username and email
				var newOneAvailable = wots.participantCode && wots.participantCode != "";
				if ((!participantCode && newOneAvailable) || 
						(newOneAvailable && (wots.participantCode != participantCode))) {
							console.log('Code was not yet stored, or was different, replace "' + 
									participantCode + '" with new participantCode "' + 
									wots.participantCode + '"' );
							participantCode = wots.participantCode;
							tx.executeSql('DROP TABLE IF EXISTS MEMO');
							tx.executeSql('CREATE TABLE IF NOT EXISTS MEMO (name, password, email, code)');
							tx.executeSql('INSERT INTO MEMO (name, password, email, code) VALUES ("' + 
										wots.username + '","' + wots.password + '","' + wots.email +
										'","' + wots.participantCode + '")');
						} 
				wots.participantCode = participantCode;

				console.log('Query result: name = "' + wots.username + '" email = "' + wots.email + '"');
				console.log('  participantCode = "' + wots.participantCode + '"');

				if (!wots.participantCode) {
					return false;
				}

				$('#username').val(wots.username);
				//$('#password').val(wots.password); don't do that, we have only md5 hash anyway
				$('#email').val(wots.email);
				$('#participantcode').val(wots.participantCode);
				return true;
			}
			// for an insert statement, this property will return the ID of the last inserted row
			console.log("Last inserted row ID = " + results.insertId);
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
					console.log("Find stand holder " + id);
					if (results.rows.item(i).id == id) {
						wots.exhibitors[c].status = results.rows.item(i).status;
						found = true;
						break;
					}
				}
				if (!found) {
					console.log("Add stand holder " + id);
					wots.exhibitors[c].status = 'undefined';
					var status = wots.exhibitors[c].status;
					console.log("With status: " + status); 
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

		noteDB = function(errCB, sucCB) {
			if (!wots.db) {
				wots.db = window.openDatabase("memo", "1.0", "Memo", 1000000);
				localdb.init(wots.db);
			}
			var sensor_id = wots.sensor_id;
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

		sensorUnknown = function(errcode, result) {
			if (errcode) {
				// create sensor and call the noteDB function again
				createSensor(noteDB);
				return;
			}
			console.log("Result (should be sensor_id) " + result);
			wots.sensor_id = result;

			// next step! create sensor data
			updateSensorData();
		}

		sensorKnown = function(errcode, result) {
			if (errcode) {
				if (!wots.sensor_id) {
					console.log("Do not call this function if sensor id is not known");
					return;
				}
				console.log("Error: " + errcode);
				if (errcode == localdb.ERR_EMPTY_TABLE) {
					// create memo in database and call noteDB function again
					console.log("Create memo in local database");
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
			wots.sensor_id = result;

			// next step! create sensor data
			updateSensorData();
		}

		updateSensorData = function() {
			console.log("Load sensor data");
			loadSensorData();

			console.log("Create memo if not yet present in CommonSense")
				createSensorData();
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

		/**********************************************************************************************************************
		 * Shortcuts for calling specific pages
		 *********************************************************************************************************************/

		registerPage = function() {
			console.log("Register new user");
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
				console.log("Update status of " + exhibitor.name + " as fulfilled");
				exhibitor.status = "done";
				standsUpdateDB();
				wotsPage();
			}
			
		}
		/*
		// set values, trick: use fixed length to set the right field
		wots.hangmanAnswer = function(object, result) {
			console.log("Object", object);
			var obj = $(object);
			console.log('Parent of obj', obj);
			console.log("Answer given by user: " + result);
			if (result.length == 4) {
				wots.passcode = result;
				//var letter = 'A';
				var exhibitor = wots.exhibitorsById[wots.selectedExhibitorId];
				console.log("Select exhibitor", exhibitor);
				var letter = exhibitor.standletter;
				console.log(" with stand letter ", letter);
				var success = checkPasscode(letter, wots.passcode);
				if(success) {
					console.log("Update status of " + exhibitor.name + " as fulfilled");
					exhibitor.status = "done";
					standsUpdateDB();
					wotsPage();
				}
			} else {
				wots.participantCode = result;
			}
		}
		hangman.hangman_setsubmit(wots.hangmanAnswer);
		*/

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

		createUser = function(username, password) {
			var user = {
				"user": {
					"email": username,
					"username": username,
					"name": "",
					"surname": "",
					"mobile": "",
					"password": password
				}
			}
			sense.createUser(user, createUserSuccessCB, generalErrorCB);
		};

		createSession = function(username, password) {
			if (test_sense) {
				console.log("Create session for user \"" + username + "\" and \"" + password + "\" with CommonSense");
			} else {
				console.log("Create session for user \"" + username + "\" with CommonSense");
			}
			sense.createSession(username, password, createSessionSuccessCB, createSessionErrorCB);
		};

		createSessionErrorCB = function() {
			console.log("Could not log in, try to create the user");
			createUser();
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
				console.log("Create user with id: " + obj.user.id);
				createSession();
			} else {
				console.log("Could not create user");
			}
		};

		updateSensor = function() {
			console.log("Update sensor");
			noteDB();
		};

		createSensor = function() {
			console.log("Create sensor");
			var sensorName = "memo"; 
			//var sensorDisplayName = "Beacon";
			//var sensorDeviceType = "nRF51822"; 
			var sensorDisplayName = "Memo BLE beacon";
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
			sense.createSensor(data, createSensorSuccessCB, generalErrorCB);
		};

		createSensorSuccessCB = function(result) {
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

		createSensorData = function() {
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
			var memoData = {
				"id": memoId,
				"text": memoText,
				"location": memoLocation,
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
			sense.createSensorData(sensor_id, data, createSensorDataSuccessCB, generalErrorCB);
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
			$('#memoAlert').val(memo.alert);
			$('#memoDate').val(memo.date);
			$('#memoRepeat').val(memo.repeat);
			setMemoColor(memo.color);
		}

		createSensorDataSuccessCB = function(result) {
			if (!result) {
				console.log("Adding sensor data should not result in a response, so this is fine");
				return;
			}
			console.log("Error?", result);
			/*
			// it is much safer to use a JSON parser, but for the purpose of example code:
			var obj = eval('(' + result + ')');
			var exists = obj && obj.sensor && obj.sensor.id;
			if (exists) {
			console.log("What to do with response?");
			//console.log("TODO: store sensor locally");
			//wots.sensor_id = obj.sensor.id;
			} else {
			console.log("Response couldn't be parsed or does not have sensor id field");
			} */
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
			console.log("Received results", result);

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

		// Start the application automatically
		start();	
	}
}

