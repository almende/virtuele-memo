function WotsApp() {
	this.exhibitors = [];
	this.exhibitorsById = {};
	this.route = [];
	this.selectedExhibitorId = null;
	this.guide = [];
	this.guidePageCnt = 0;
	this.username = "";
	this.email = "";
	this.db = null;
	this.code = "";
	this.calculated = false;
}

WotsApp.prototype = {
	start:function() {
		var wots = this;

		var ble = new BLEHandler();

		var hangman = new Hangman();

		$.ajaxSetup({ cache: false });

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
			console.log("Account refreshed, now check if we have the code");
			if (!wots.code) {
				alert("We don't have the right code available, sorry you have to enter it again!");
				registerPage();
			} else {
				interpretCode(wots.code);
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
			for (var c = 0; c < wots.exhibitors.length; c++) {
				var exhibitor = wots.exhibitors[c];
				var onRoute = false;
				for (var j = 0; j < wots.route.length; j++) {
					console.log("Is stand " + exhibitor.standletter + " on the route?");
					if (wots.route[j] == exhibitor.standletter) {
						console.log("Yes");
						onRoute = true;
						break;
					}
				}
				// skip to next exhibitor if not on route
				if (!onRoute) continue;

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
//				if (enabledClass == "taskEnabled") {
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
/*				} else {
					$(exhibitorList)
						.append($('<li/>', { "class":doneClass + ' ' + enabledClass })
							.append('<span>' + exhibitor.name + '</span>')
							.append('<p>' + exhibitor.oneliner + '</p>'))
						;
				} */

				prevExhibitor = exhibitor;
			} // End for-loop
			$('#exhibitorList').listview('refresh');
		}

		$('#exhibitorList').on('click', 'li a', function(event) {
			wots.selectedExhibitorId = $(this).attr('data-id');
			$.mobile.changePage("#exhibitorDetailsPage", {transition:'slide', hashChange:true});
			event.preventDefault();
		});

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
						var fixedLength = 4;
						hangman.generateHangman(fixedLength);
					}
					$('#questionParagraph').text(questionText);
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

		// on Android horizontal swipe distance might be too wide, you'll have to swipe far and fast...
		// do something about it!
		$('#virtualMemoPage').on('swiperight', function(event) {
			$('#virtualMemoPanel').panel("open");
		});

		$('#virtualMemoPage').on('pageshow',function(e,data) { 
			var windowHeight = $(window).height();
			var headerHeight = $('[data-role=header]').height();
			var footerHeight = $('.ui-footer').height();
			var memoHeight = $('#memoNote').outerHeight();
			//var marginTop = (windowHeight - headerHeight - footerHeight - memoHeight)/2;
			var marginTop = (windowHeight - memoHeight - footerHeight)/2;
			console.log('windowHeight: ' + windowHeight + ', headerHeight: ' + headerHeight + ', footerHeight: ' + footerHeight + ', memoHeight: ' + memoHeight + ', marginTop: ' + marginTop);
			$('#memoNote').css('margin-top',marginTop);

			// set up bluetooth connection
			ble.init();
		});

		// coupling with a button is simple through an on-click event through jQuery
		$('#sendAlert').on('click', function(event) {
			console.log('Click event received');
			ble.readLinkLoss();
		});

		// very important statement to make swiping work: 
		// https://stackoverflow.com/questions/12838443/swipe-with-jquery-mobile-1-2-phonegap-2-1-and-android-4-0-4-not-working-properl
		document.ontouchmove = function(event) {    
		        event.preventDefault();
		};

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
					var list_item = $('<li/>', {'class': 'guidePageBtn pageDisabled', 'id': i});
					list_item.on('click', function(event) {
						id=$(this).attr ( "id" );
						guidePage(id);
					});
					$(guideStatusBar).append(list_item);
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
		
		$('#registerPage').on('pagecreate', function() {
			console.log("Create register page");

			var fixed_length = 14;
			hangman.generateHangman1(fixed_length);
			$(".hangman#h2").val("-")

			var registerText = "Registreer jezelf, zodat je later deze applicatie ook thuis kan gebruiken!";
			var explanation = $('<p/>').text(registerText);
			$('#registerExplanation').empty().append(explanation);
			var btnText = "registreer";
			var btn= $('<input type="button" class="bottomButton" value="' + btnText + '"/>');
			btn.on('click', function(event) {
				var username = $('#username').val();
				var email = $('#email').val();
				if (interpretCode()) {
					var code = wots.code;
					registerNow(username, email, code);
				}
			});
			var center = $('<div id="explanationButton" align="center"></div>');
			$('#registerExplanation').append(center);
			center.append(btn);
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

		interpretCode = function(code) {
			if (!code) {
				// no code as argument, than try to get it
				hangman.hangman_dosubmit();
				code = wots.code;
			}

			console.log("Check code: " + code);
			if (code.length != 14) {
				console.log("Code should be 14 tokens, but is " + code.length);
				return false;
			}
			for (var c = 0; c < 6; ++c) {
				var letter = code[c*2+3];
				var ascii = letter.charCodeAt(0) - 65 + 10; // 'A' = 65, cast to numeric '10'
				console.log("Letter " + letter + " becomes " + ascii);
				if (ascii < 10 || ascii > 36) {
					var loc = c*2+3;
					alert('Incorrect symbol at location ' + loc + '!');
					return false;
				}
				wots.route[c] = letter;
				console.log('Added to the route stand "' + wots.route[c] + '"');
			}
			if (wots.route.length != 6) {
				console.log("Route should have had 6 stops, but has " + wots.route.length);
				return false;
			}
			return true;	
		}

		registerNow = function(username, email, code) {
			console.log("Register " + username + " with email address " + email);
			wots.username = username;
			wots.email = email;
			wots.code = code;
			accountDB(calcRoutePage);
		}

		accountDB = function(callback) {
			if (!wots.db) wots.db = window.openDatabase("memo", "1.0", "Memo", 1000000);
			if (typeof(callback) == "function") {
				wots.db.transaction(queryAccountDB, errorCB, callback);
			} else {
				wots.db.transaction(queryAccountDB, errorCB);
			}
		}

		standsDB = function(callback) {
			console.log("Get stands from database");
			if (!wots.db) wots.db = window.openDatabase("memo", "1.0", "Memo", 1000000);
		
			if (typeof(callback) == "function") {
				wots.db.transaction(queryStandsDB, errorCB, callback);
			} else {
				wots.db.transaction(queryStandsDB, errorCB);
			}
//			console.log("Got data from database, now call callback");
//			if (typeof(callback) == "function") callback();
		}

		queryStandsDB = function(tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS STANDS (id, status)');
			tx.executeSql('SELECT * FROM STANDS', [], queryStandsSuccess, errorCB);
		}

		/**
		 * This is the pattern which works, get stand owners, and if they do not exist, fill the database. 
		 * Do not fill the database if it is already filled
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
					tx.executeSql('INSERT INTO STANDS (id, status) VALUES ("' + id + '","' + status + '")');
				}
			}
			return true;
		}
		
		
		errorCB = function(tx, err) {
			console.log("Error processing SQL:", err);
		}

		successCB = function() {
			console.log("Successful SQL query");
		}

		queryAccountDB = function(tx) {
			//tx.executeSql('DROP TABLE IF EXISTS MEMO');
			tx.executeSql('CREATE TABLE IF NOT EXISTS MEMO (name, email, code)');
			tx.executeSql('SELECT * FROM MEMO', [], queryAccountSuccess, errorCB);
		}

		queryAccountSuccess = function(tx, results) {
			var len = results.rows.length;
			console.log("Returned rows = " + len);
			if (!results.rowsAffected) {
				
				if (!len) {
					console.log("Nothing in database yet, write account data to it");
					// write entries to database
					tx.executeSql('INSERT INTO MEMO (name, email, code) VALUES ("' 
						+ wots.username + '","' + wots.email +  '","' + wots.code + '")');
					return false;
				}

				var i = len - 1; // most recent added entry
				wots.username = results.rows.item(i).name;
				wots.email = results.rows.item(i).email;
				var code = results.rows.item(i).code;
				// if code is different, replace it...
				// todo: same with username and email
				if ((!code && wots.code && wots.code != "") || (code && wots.code != "" && wots.code != code)) {
					console.log('Code was not yet stored, or was different, replace "' + code + '" with new code "' + wots.code + '"' );
					code = wots.code;
					tx.executeSql('DROP TABLE IF EXISTS MEMO');
					tx.executeSql('CREATE TABLE IF NOT EXISTS MEMO (name, email, code)');
					tx.executeSql('INSERT INTO MEMO (name, email, code) VALUES ("' 
						+ wots.username + '","' + wots.email +  '","' + wots.code + '")');
				} 
				wots.code = code;

				console.log('Query result: name = "' + wots.username + '" email = "' + wots.email + '"');
				console.log('  code = "' + wots.code + '"');
				
				$('#username').val(wots.username);
				$('#email').val(wots.email);
				for (var c = 0; c < wots.code.length; c++) {
					$('.hangman#h' + c).val(wots.code[c]);
				}

				return true;
			}
			// for an insert statement, this property will return the ID of the last inserted row
			console.log("Last inserted row ID = " + results.insertId);
		}

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
		
		// return fixed 4-pins pincode given by the user as answer
		wots.hangmanAnswer = function(result) {
			console.log("Answer given by user: " + result);
			wots.code = result;
		}
		hangman.hangman_setsubmit(wots.hangmanAnswer);
		
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

	}
}

