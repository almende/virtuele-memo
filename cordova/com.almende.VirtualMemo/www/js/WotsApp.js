function WotsApp() {

	/**************************************************************************************************************
	 * Fields that we use in the WOTS application
	 *************************************************************************************************************/

	// exhibitor fields are still necessary, we want to show who created the Virtuele Memo device
	this.exhibitors = [];
	this.exhibitorsById = {};
	this.selectedExhibitorId = null;

	// the guide 
	this.guide = [];
	this.guideSubPageCnt = 0;
	
	// username, email, password
	this.username = "";
	this.email = "";
	this.password = "";

	// the local database, so the experience of the user is seamless
	this.db = null;
	
	// the current memos
	this.memos = [];
	this.current_memo = {};

	// 
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

		var iBeacon = new iBeaconHandler();

		var databaseName = "MEMO_TEST_DATABASE";

		var sense = SenseAPI;

		var localdb = LocalDB;

		var crypto = CryptoJS;

		// size set to 200.000 bytes
		var databaseSize = 200000;

		var iOSPlatform = "iOS";
		var androidPlatform = "Android";

		var iBeaconUuid = '2ca36943-7fde-4f4e-9c08-dda29f079349';
		
		var defaultMemoText = "Lijm de Virtuele Memo op je koelkast. Gebruik het als boodschappenlijstje voor je huisgenoot, een kooklijst, of als herinnering voor jezelf om naar de kapper te gaan op zaterdag. :-)";

		$.ajaxSetup({ cache: false });

		// swiping and scrolling combined is a beast
		// https://stackoverflow.com/questions/12838443/\
		//   swipe-with-jquery-mobile-1-2-phonegap-2-1-and-android-4-0-4-not-working-properl
		// the work-around sets event.preventDefault() for only horizontal touchmove events so that the swipe
		// event get triggered, but not for vertical ones, so that scrolling still works
		// https://github.com/jquery/jquery-mobile/issues/5534
		// todo: only bind at proper pages, not on all document touch events
		var touch = {};
		document.ontouchstart = function(event) {
			var t = event.touches[0];
			touch.x = t.clientX;
			touch.y = t.clientY;	
		}
		document.ontouchmove = function(event) {
			if (event.touches.length == 1) { 
				var t = event.touches[0];
				var deltaX = t.clientX - touch.x;
				var deltaY = t.clientY - touch.y;
				var absX = Math.abs(deltaX);
				var absY = Math.abs(deltaY);
				if (absX > absY) {
					event.preventDefault();
				}
			}
		};

        document.addEventListener("pause", onPause, false);

        function onPause() {
            ble.doBackGroundScan();
        }

        // add home button to each page that has a header
		$(document).delegate('[data-role="page"]', 'pageinit', function () {
                        
			//check for a `data-role="header"` element to add a home button to
			var $header = $(this).children('[data-role="header"]');
			if ($header.length) {
				//create a link with a `href` attribute and a `class` attribute,
				//then turn it into a jQuery Mobile button widget
                        	if (window.device.platform == iOSPlatform) {
					$header.append($('<a />', { 
						class : 'ui-btn-right', style : 'margin-top: 15px;', href : '#virtualMemoPage' }).buttonMarkup(
						{ icon: "home", iconpos : "notext" }));
				} else {
					$header.append($('<a />', { 
						class : 'ui-btn-right', href : '#virtualMemoPage' }).buttonMarkup(
						{ icon: "home", iconpos : "notext" }));
				}
			}    
		});

		// add menu options 
		$('.virtualMemoPanel ul').append('<li><a href="#virtualMemoPage">Memo</a></li>');
		$('.virtualMemoPanel ul').append('<li><a href="#memoOverviewPage">Overzicht</a></li>');
		$('.virtualMemoPanel ul').append('<li><a href="#allExhibitorsPage">Partners</a></li>');
		$('.virtualMemoPanel ul').append('<li><a href="#guideHomeMemo">Help</a></li>');
		$('.virtualMemoPanel ul').append('<li><a href="#registerPage">Account</a></li>');
		$('.virtualMemoPanel ul').append('<li><a href="#resetPage">Reset</a></li>');

		// add swipe gesture to all pages with a panel
		$(document).delegate('[data-role="page"]', 'pageinit', function () {
			//check for a `data-role="panel"` element to add swiperight action to
			var $panel = $(this).children('[data-role="panel"]');
			if ($panel.length) {
				$(this).on('swiperight', function(event) {
					$panel.panel("open");
				});
			}    
		});

		var update_memo_overview = false;

		var testing = false;
		var test_sense = false;
		var delete_mysql_stands = false;
		var testing_memo_overview = false;

		// This option makes use of the CommonSense database in the way suggested by Sense itself. 
		// It creates a user for every device. 
		var device_as_user = true;

		// at which page to start?
		start = function() {

			console.log("Started the Virtuele Memo application");
			init();
			setNotificationTriggers();

			memoPage();
		}

		/**
		 * Initialize the application. This sets a few class-wide fields, such as:
		 *   wots.platform
		 */
		init = function() {
			if (window.device) {
				console.log("We are running on the \"" + device.platform + "\" platform");
				wots.platform = device.platform;
				console.log("With device name \"" + device.name + "\"");
			} else {
				console.log("We are running in the browser, not a smartphone or tablet");
				wots.platform = 'browser';
			}

			if (wots.platform === 'browser') {
				// we are running in chrome, not in Android or iOS at least
				console.log("Just disable the device-as-user option");
				device_as_user = false;
			}
			// For testing purposes
			//delete_mysql_stands = true;
			//testing = true;
		}

		/*******************************************************************************************************
		 * A list of helper functions for the GUI
		 ******************************************************************************************************/

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

		allExhibitorsPage = function() {	
			console.log("Go to the page with all exhibitors");
			$.mobile.changePage("#allExhibitorsPage", {transition:'none', hashChange:true});
		};


		// this loads exhibitor information from a local .js data file, but doesn't know how to store state
		// information...
		$('#allExhibitorsPage').on('pageshow', function() {
			wots.mode = 'conference';
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
					var subtitle = exhibitor.oneliner;
					if (!subtitle || (subtitle == "")) {
						subtitle = exhibitor.description;
					}
					allExhibitorsList.append($('<li/>', "class:taskDownSelf taskEnabled")
						.append(
							$('<a/>', {
								'href':'#',
								'data-transition':'slide',
								'data-id':exhibitor.id
							})
							.append('<span>' + exhibitor.name + '</span>')
							.append('<p>' + subtitle + '</p>')
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
		
		$('#allExhibitorsPage').on('swiperight', function(event) {
			console.log("Open panel in partner list");
			$('#allExhibitorsPage .virtualMemoPanel').panel("open");
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
				if (exhibitor.description) {
					$('#allExhibitorDescription').text(exhibitor.description);
				}
				if (exhibitor.address) {
					$('#allExhibitorAddress').text(exhibitor.address);
				}
				if (exhibitor.tel) {
					var spaceless_tel = exhibitor.tel.replace(/\s+/g, '');
					var clickable_tel = '<a href="tel:' + spaceless_tel + '">tel: ' + 
						exhibitor.tel + '</a>';
					$('#allExhibitorTel').html(clickable_tel);
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
		 * The functionality around the memo notes
		 ******************************************************************************************************/

		memoPage = function() {	
			console.log("Go to the memo page");
			$.mobile.changePage("#virtualMemoPage", {transition:'none', hashChange:true});
		};

		$('#virtualMemoPage').on('pageshow',function(e,data) { 
			wots.mode = 'home';
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
				$('#datePicker input').valueAsDate = new Date();
				$('#colorPicker ul').append($li);
			}

			$('#memoText').text(defaultMemoText);

			$('#saveMemo').on('click', function(event) {
				var new_id = wots.memos.length;
				console.log("Save new memo note with id " + new_id);
				updateCurrentMemoId(new_id);
				setAsideMemo();
				updateSensor();
			});

			$('#deleteMemo').on('click', function(event) {
				console.log("Delete memo note");
				deleteSensorData();
			});

			$('#prevMemo').on('click', function(event) {
				if (wots.memos.length <= 1) return;
				var memo_id = getCurrentMemoId();
				var attempts = 0;
				do {
					memo_id = (memo_id + wots.memos.length - 1) % wots.memos.length;
					var errcode = displaySensorData(memo_id);
					attempts++;
				} while (errcode == 2 || attempts > 3);
			});

			$('#nextMemo').on('click', function(event) {
				if (wots.memos.length <= 1) return;
				var memo_id = getCurrentMemoId();
				var attempts = 0;
				do {
					memo_id = (memo_id + wots.memos.length + 1) % wots.memos.length;
					var errcode = displaySensorData(memo_id);
					attempts++;
				} while (errcode == 2 || attempts > 3);
			});

			// call function that queries for the address at regular times
			console.log("Start connection status updates");
			updateConnectionState();

			// set up bluetooth connection
			//console.log("Set up bluetooth connection");
			//ble.init();
			reinitializeBluetooth();

		});

		/*
		 * On again showing a page (not creating it), it might be that the global fields for email and password
		 * have been lost (for example when an app comes back from the background). Hence, check if this is
		 * the case.
		 */
		$('#virtualMemoPage').on('pageshow',function(e,data) { 
			if (!wots.email || !wots.password) {
				console.log('Email or password are not available.');
				accountDB(loginUser);
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
					break;
				}
			}
			var nr = parseInt(color, 16);
			var grad0 = (nr+inc0).toString(16);
			var grad1 = (nr+inc1).toString(16);
			$('#memoNote').css('background', 
					'linear-gradient(-5deg, #' + grad1 + ' 10%,#' + grad0 + ' 100%)');
			// exception for dark blue
			if (nr == parseInt("0000ff", 16)) {
				console.log("Set font color to white");
				$('#memoNote').css('color', 'white');
			} else {
				$('#memoNote').css('color', 'black');
			}	
		};

		/*******************************************************************************************************
                 * The functionality to communicate over Bluetooth Low-Energy
                 ******************************************************************************************************/
        
		updateConnectionStatus = function(result) {
			if (result) {
				console.log("Result connection status: " + result.isConnected);
				wots.isConnected = result.isConnected;
			}
		};

		updateConnectionState = function() {
			if (!wots.platform || (wots.platform === 'browser')) {
				return;
			}
			//console.log("Query bluetooth address");
			var address = ble.getAddress();
			if (!address) {
				$('#connection').text('Geen magneet in de buurt');
			} 

			if (address) {
				$('#connection').text('Magneet ' + ble.getAddress());
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
			if (!wots.platform || (wots.platform === 'browser')) {
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

		/*******************************************************************************************************
		 * The functionality to manage all memos
		 ******************************************************************************************************/

		memoOverviewPage = function() {
			console.log("Memo overview page. Register new user, or adapt user registration details");
			$.mobile.changePage("#memoOverviewPage", {transition:'slide', hashChange:true});
		}

		$('#memoOverviewPage').on('pagebeforeshow',function(event) { 
			console.log("Start querying for multiple memos");
			ble.discoverAll(true);
			update_memo_overview = true;
			updateMemoOverview();
		});
		
		$('#memoOverviewPage').on('pagebeforehide',function(event) { 
			console.log("Stop querying for multiple memos. Resume normal operation.");
			update_memo_overview = false;
			ble.discoverAll(false);
		});

		updateMemoOverview = function() {
			if (!update_memo_overview) return;

			var devices = ble.getAllDevices();
			console.log("We found the devices: " + JSON.stringify(devices));

			if (testing_memo_overview) {
				var dev = {};
				dev.address = 'test';
				dev.name = 'Memo';
				devices['test'] = dev;
				update_memo_overview = false;
			}

			if (devices) { 
				// just clear list, todo: check if devices changed... and only update changed ones
				$('#memoNoteSet ul').empty();

				var i = 0;
				for (var address in devices) {
					var device = devices[address];
					console.log("Add device: " + JSON.stringify(device));
					var $li = $('<li/>');
					var $memodiv = $('<div/>', {'id': 'memoNoteMini', 'data-memo-overview-id': i});
					var $memocaptiontext = $('<p/>').text(address);
					var $memocaption = $('<div/>', {'id': 'memoBriefCaption' });
					var $memoheader = $('<div/>', {'id': 'memoHeaderCenter'});
					var $memodelete = $('<a href="#deleteMemoBlock" id="deleteMemoBlock" data-role="button"' +
						'data-icon="delete" data-iconpos="notext" data-transition="none" class="menu-button"></a>');
					var $memoalert = $('<a href="#sendAlert" id="sendAlert_'+i+'" data-role="button"' + ' data-id="'+address+'" '+
						'data-icon="check" data-iconpos="notext" data-transition="none" class="menu-button-right"></a>');
					$memoheader.append($memodelete);
					$memoheader.append($memoalert);

					$memocaption.append($memocaptiontext);
					$memodiv.append($memocaption);
					$memodiv.append($memoheader);
					$li.append($memodiv);
					$('#memoListView').append($li).trigger('create');


					// coupling with a button is simple through an on-click event through jQuery
					$('#sendAlert_'+i).on("click", function(event) {
						// select a new memo
						console.log('Clicked on memo #'+i);
						var address = $(this).attr('data-id');
						console.log('Connection to memo '+address);
						//wots.address = address;
						ble.setAddress(address,memoPage, "high");

					});

					i++;
				}
			}

			setTimeout(function () {
				updateMemoOverview();
			}, 3000); 
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
					var prefix = 'homeGuidePage';
					var $li = $('<li/>', {'class': 'guideHomeSubPageBtn pageDisabled', 'id': 
						prefix + i});
					$li.on('click', function(event) {
						var np=$(this).attr ( "id" );
						var prefix = 'homeGuidePage';
						var page = parseInt(np.slice(prefix.length));
						guideHomeSubPage(page);
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
				var prefix = 'homeGuidePage';
				var page = parseInt(np.slice(prefix.length));
				//var page = parseInt(np);
				console.log("Swipe left, go to next page " + page);
				guideHomeSubPage(page);
			}
		});

		$('#guideHomeMemo').on('swiperight', function() {
			var cp = $('.guideHomeSubPageBtn.pageEnabled').last().attr('id');
			var prefix = 'homeGuidePage';
			var page = parseInt(cp.slice(prefix.length));
			//var page = parseInt(cp);
			if (page != 0) {
				page--;	
				console.log("Swipe right, go to previous page" + page);
				guideHomeSubPage(page);
			}
		});

		guideHomeSubPage = function(p) {
			if (!p) {
				p = 0;
			}
			console.log("Home guide - go to page " + p);
			var page = parseInt(p);
			switch(page) {
				case 0: $('#guideHomeSubPage').css('background-image', 'url(css/images/guidehome_page0.png)' );
					$('.guideHomeSubPageBtn#homeGuidePage' + page).removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#homeGuidePage1').removeClass('pageEnabled').addClass('pageDisabled');
					$('.guideHomeSubPageBtn#homeGuidePage2').removeClass('pageEnabled').addClass('pageDisabled');
					var explanation = $('<p/>').text(wots.guideHome[page].description);
					$('#guideHomeExplanation').empty().append(explanation);
					break;
				case 1: $('#guideHomeSubPage').css('background-image', 'url(css/images/guidehome_page1.png)' );
					$('.guideHomeSubPageBtn#homeGuidePage0').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#homeGuidePage' + page).removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#homeGuidePage2').removeClass('pageEnabled').addClass('pageDisabled');
					var explanation = $('<p/>').text(wots.guideHome[page].description);
					$('#guideHomeExplanation').empty().append(explanation);
					break;
				case 2: $('#guideHomeSubPage').css('background-image', 'url(css/images/guidehome_page2.png)' );
					$('.guideHomeSubPageBtn#homeGuidePage0').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#homeGuidePage1').removeClass('pageDisabled').addClass('pageEnabled');
					$('.guideHomeSubPageBtn#homeGuidePage' + page).removeClass('pageDisabled').addClass('pageEnabled');
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
			$('#username').keypress( function(event) {
				if (event.keyCode == 13) {
					$("#password").focus();
				}
			});
			$('#password').keypress( function(event) {
				if (event.keyCode == 13) {
					$("#email").focus();
				}
			});
			$('#email').keypress( function(event) {
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

			// create common sense session
			csStart(csCreateSession, wots.email, wots.password);
			registerNow(username, password, email);
		}

		$('#registerPage').on('swipeleft', function() {
			calcRoutePage();
		});

		$('#registerPage').on('swiperight', function() {
			$.mobile.changePage("#guideMemo", {transition:'slide', hashChange:true});
			var lastPage = wots.guideSubPageCnt - 1;
			guideSubPage(lastPage);
		});

		registerNow = function(username, password, email) {
			console.log("Register " + username + " with email address " + email);
			wots.username = username;
			wots.password = password;
			wots.email = email;
			console.log("Registered... Email: " + wots.email);
			accountDB(memoPage);
		}

		/*******************************************************************************************************
		 * General local database functions
		 ******************************************************************************************************/

		dbMessage = function(msg, error) {
			if (error) {
				console.error("Local database: " + msg);
			} else {
				console.log("Local database: " + msg);
			}
		}

		errorCB = function(tx, err) {
			var msg = "Error processing SQL:" + JSON.stringify(err);
			dbMessage(msg, true);
		}

		successCB = function() {
			var msg = "Successful SQL query";
			dbMessage(msg, false);
		}

		/*******************************************************************************************************
		 * Get account data from the local database
		 ******************************************************************************************************/

		accountDB = function(callback) {
			if (!wots.db) {
				wots.db = window.openDatabase(databaseName, "1.0", "Memo", databaseSize);
				localdb.init(wots.db);
			}
			if (testing) {
				localdb.deleteUsers();
                localdb.deleteMapping();
			}
			localdb.createUsers();
			var msg = "Get user";
			dbMessage(msg, false);
			localdb.getUser(userObtained, callback);
		}

		userObtained = function(errcode, result, callback) {
			var updateDB = false;
			if (errcode) {
				var msg = "There is no user in the database";
				dbMessage(msg, true);
				updateDB = true;
			} else {
				updateDB = updateMemUser(result);
			}

			if (updateDB) {
				var msg = "Update user with new user information";
				dbMessage(msg, false);
				localdb.deleteUsers(function createUsers() {
					localdb.createUsers(function createUser() {
						var user = {
							'username': wots.username,
							'password': wots.password,
							'email': wots.email
						}
						var msg = "Create user: " + JSON.stringify(user); 
						dbMessage(msg, false);
						localdb.createUser(wots.username, wots.password, wots.email, 
								function displayUser() {
							displayUserData();
							if (callback && typeof(callback) === "function") {
								console.log("Go on after obtaining user");
								callback();
							}
						});
					});
				});
			} else {
				var msg = "User is already stored in the database";
				dbMessage(msg, false);
				if (callback && typeof(callback) === "function") {
					var msg = "Execute callback after getting user";
					dbMessage(msg, false);
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

			// check if anything changed				
			updated = updated || (wots.username && (wots.username != user.name));
			updated = updated || (wots.password && (wots.password != user.password));
			updated = updated || (wots.email && (wots.email != user.email));
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
		}

		/*******************************************************************************************************
		 * Get note data from the local database
		 ******************************************************************************************************/

		noteDB = function() {
			if (!wots.db) {
				wots.db = window.openDatabase(databaseName, "1.0", "Memo", databaseSize);
				localdb.init(wots.db);
				if (testing) {
					wots.db.removeMemos();
					wots.db.createMemos();
				}
			}
			var sensor_id = getSensor();
			if (sensor_id) {
				// get specific memo out of database
				console.log("Get sensor out of database using sensor_id " + sensor_id);
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

		/**
		 * In the local database there is no sensor id known. This does however not mean that there is no
		 * sensor in the CommonSense database, so we have to check if any sensor with the proper name exists
		 * over there. This is where we assume that the sensor is called "Memo0".
		 */
		sensorUnknown = function(errcode, result) {
			if (errcode) {
				if (result) {
					console.error(result);
				}
				console.log("No sensor found locally, we will check if one exists on the server");
				var index = 0;
				csExistSensor(index, function() { 
					console.log("Sensor unknown, but memo block is present on server," +
						" so sensor id could be obtained");
					// sensor id is set now, retry with known sensor id
					noteDB();
				},
				function() {
					// create sensor, after csCreateSensor noteDB will be called in csCreateSensorSuccessCB
					console.log("Create memo block because it is not present in CommonSense");
					csCreateSensor();
				})
				return;
			}
			console.log("Result (should be sensor_id) " + result);
			setSensor(result);

			// next step! create sensor data
			updateSensorData();
		}

		/**
		 * There is locally a sensor id known. However, this does not mean that the sensor id on the 
		 * CommonSense server exists. It might be deleted for example.
		 */
		sensorKnown = function(errcode, result) {
			// on error, we have not sufficient local data, we need it from the server
			if (errcode) {
				if (!getSensor()) {
					console.log("Do not call this function if sensor id is not known");
					return;
				}
				console.log("An (anticipated) error from the local db: " + errcode);
				if ((errcode == localdb.ERR_EMPTY_TABLE) || (errcode == localdb.ERR_GENERAL)) {
					if (!wots.sensor_id) {
						console.error("Mmmm... we should have a sensor id here");
						return;
					}
					console.log("Empty table or general error. Fill local database");
					// we create the table itself
					localdb.createMemos();
					// create memo in database and call noteDB function again
					console.log("Create memo with id " + wots.sensor_id + " in local database");
					localdb.createMemo(wots.sensor_id, 
							noteDB);
				} else if (errcode == localdb.ERR_COMPARE) {
					// just add memo, although there is already one there, perhaps person deleted it
					// in the commonsense database
					console.log("Create new memo in local database");
					localdb.createMemo(wots.sensor_id, 
							noteDB);
				} else {
					console.error("An unknown error! " + errcode);
				}
				return;
			}
			console.log("Result (should be sensor_id) " + result);
			setSensor(result);

			csExistSpecificSensor(result, function() {
				// next step! create sensor data
				updateSensorData();
			}, function() {
				// sensor does not exist
				csCreateSensor();
			});
		}

		updateSensorData = function() {
			console.log("First load sensor data from CommonSense");
			loadSensorData();

			console.log("Now write memo if necessary");
			var index = 0;
			csExistSensor(index, function() { 
				console.log("Memo block is present. Write to CommonSense");	
				// we have wots.memo through loadSensorData
				// we now get current memo 
				var memo = getCurrentMemo();
				// we can now write all of it to CommonSense again
				csCreateSensorData();
			},
			function() {
				console.log("Create memo note if not yet present in CommonSense");
				//csGetSensorData();
				csCreateSensorData();
			});
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

		/*******************************************************************************************************
		 * Communication with the CommonSense database
		 ******************************************************************************************************/

		csMessage = function(msg, error) {
			if (error) {
				console.error("CommonSense: " + msg);
			} else {
				console.log("CommonSense: " + msg);
			}
		}

		csSuccessCB = function(response) {
			var msg = "Successful CommonSense call: " + response;
			csMessage(msg, false);
		}

		csErrorCB = function(response) {
			var msg = "General error: " + response;
			csMessage(msg, true);
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
					var msg = "Check server failure: " + response.msg;
					csMessage(msg, true);
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
					var msg = "Change username to " + account.email + " and password to " + 
						account.password;
					csMessage(msg, false);
					sense.createUser(user, createUserSuccessCB, generalErrorCB);
				} else {
					var msg = "Create a user in the database is not possible. " + 
						"Device is not yet connected. " + 
						"To connect to CommonSense we need the Memo Bluetooth address " +
						"to login to our account";
					csMessage(msg, false);
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
					var msg = "Change username to " + account.email + " and password to " + 
						account.password;
					csMessage(msg, false);
					sense.createSession(account.email, account.password, createSessionSuccessCB, createSessionErrorCB);
				} else {
					var msg = "Session with database could not be set up. " + 
						"Device is not yet connected. " + 
						"To connect to CommonSense we need the Memo Bluetooth address " +
						"to login to our account.";
					csMessage(msg, false);
				}
			} else {
				var msg = "Create session for user \"" + email + "\" and \"" + password + "\"";
				csMessage(msg, false);
				sense.createSession(email, password, createSessionSuccessCB, createSessionErrorCB);
			}
		};

		loginAsDevice = function() {
			if (ble.getAddress() == null) return null;
			if (!deviceAvailable()) return null;
			var email = "memo@"+ble.getAddress();
			var password = 'memo:' + ble.getAddress();
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
			var msg = "Could not log in, try to create the user";
			csMessage(msg, true);
			csStart(csCreateUser);
		};

		createSessionSuccessCB = function(result) {
			var msg = "Successfully logged in (" + result + "). Now update sensor.";
			csMessage(msg, false);
			updateSensor(true);
		};

		generalErrorCB = function(err_msg) {
			var msg = "Error: " + JSON.stringify(err_msg);
			csMessage(msg, true);
		};

		createUserSuccessCB = function(result) {
			var msg = "User created: " + JSON.stringify(result);
			csMessage(msg, false);
			var obj = eval('(' + result + ')');
			var exists = obj && obj.user && obj.user.id;
			if (exists) {
				var msg = "Created user with id: " + obj.user.id;
				csMessage(msg, false);
				// TODO: login
				//csCreateSession();
			} else {
				var msg = "Could not create user";
				csMessage(msg, true);
			}
		};

		updateSensor = function(first_time) {
			console.log("Update the entire memo block");
			noteDB();
			if (first_time) {
				// display the last memo first, this does not work
				//if (wots.memos.length) {
				//var memo_id = wots.memos.length-1;
				//displaySensorData(memo_id);
				//}
			}
		};

		csCreateSensor = function() {
			var msg = "Create sensor";
			csMessage(msg, false);
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
			var msg = "Data to create the sensor " + JSON.stringify(data);
			csMessage(msg, false);
			sense.createSensor(data, csCreateSensorSuccessCB, generalErrorCB);
		};

		csCreateSensorSuccessCB = function(result) {
			var msg = "Sensor successfully created: " + JSON.stringify(result);
			csMessage(msg, false);
			// it is much safer to use a JSON parser, but for the purpose of example code:
			var obj = eval('(' + result + ')');
			var exists = obj && obj.sensor && obj.sensor.id;
			if (exists) {
				var msg = "Set sensor id: " + obj.sensor.id;
				csMessage(msg, false);
				setSensor(obj.sensor.id);
				noteDB();
			} else {
				var msg = "Response couldn't be parsed or does not have sensor id field";
				csMessage(msg, true);
			}
		};

		/*
		 * Check if there is a unknown sensor with a known name. This is coupled to the index of the memo page.
		 */
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
							console.log("Found sensor with id " + sensor.id);
							setSensor(sensor.id);
							successCB();
							return;
						} else {
							console.log("Found memo sensor, but with different id");
							console.log("Compared " + sensor.display_name + " with " + search_term);
							continue;
						}
					}	
				}
				errorCB();
			}, generalErrorCB);			
		}

		csExistSpecificSensor = function(index, successCB, errorCB) {
			console.log("Get specific sensor");
			sense.sensor(index, successCB, errorCB);
		}

		memoExists = function(memoId) {
			var debug = true;

			if (debug) {
				var ids = "";
				for (m in wots.memos) {
					var memo = wots.memos[m];
					console.log("Memo: " + JSON.stringify(memo));
					ids += memo.id + ' ';
				}
				console.log("Current memos: " + ids + " and searching for " + memoId);
			}
			for (m in wots.memos) {
				var memo = wots.memos[m];
				if (memo.id == memoId) {
					return true;
				}
			}
			return false;
		}

		csCreateSensorData = function() {			
			var msg = "Try to write new memo note to CommonSense database";
			csMessage(msg, false);
			if (!wots.sensor_id) {
				console.log("There is no sensor id stored");
				return;
			}
			var sensor_id = wots.sensor_id;

			if (!wots.current_memo || wots.current_memo.text == "") {
				console.log("No current memo set");
				return;
			}

			var memoId = wots.current_memo.id;

			if (typeof memoId === 'undefined') {
				var msg = "There is no current memo set. Probably at startup, so no need to write";
				csMessage(msg, false);
				return;
			}

			if (memoExists(memoId)) {
				var msg = "But memo already exists in CommonSense database!";
				csMessage(msg, false);
				return;
			} 

			var memoText = wots.current_memo.text;

			if (memoText == defaultMemoText) {
				var msg = "Do not store default memo";
				csMessage(msg, false);
				return;
			}

			var memoLocation = wots.current_memo.location;
			var memoAlert = wots.current_memo.alert;
			var memoDate = wots.current_memo.date;
			var memoRepeat = wots.current_memo.repeat;
			var memoColor = wots.current_memo.color;
			var memoAuthor = wots.current_memo.author;
			var memoTitle = wots.current_memo.title;
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
			var msg = "Data to write to sensor " + sensor_id + " is " + JSON.stringify(data);
			csMessage(msg, false);
			sense.createSensorData(sensor_id, data, csCreateSensorDataSuccessCB, generalErrorCB);
		};
		
		setAsideMemo = function() {
			var memo = wots.current_memo;
			memo.id = $('#memoNote').data('memo-id');
			memo.text = $('#memoText').val();
			memo.location = $('#memoLocation').val();
			memo.alert = $('#memoAlert').val();
			memo.date = $('#memoDate').val();
			memo.repeat = $('#memoRepeat').val();
			memo.color = $('#memoNote').data('memo-color');
			memo.author = wots.username;
			memo.title = $('#memoTitle').val();
			console.log("Memo set apart is ", memo);
		}

		deleteSensorData = function() {
			if (wots.memos <= 1) {
				console.log("Cannot delete last memo");
				return;
			}
			var memo_id = getCurrentMemoId();
			var memo = getCurrentMemo();
			if (!memo) return;
			var data_id = memo.data_id;
			var sensor_id = wots.sensor_id;
			console.log("Delete memo " + data_id + " in CommonSense");
			sense.deleteSensorData(sensor_id, data_id, csSuccessCB, csErrorCB);
			console.log("Delete memo " + memo_id + " locally");
			wots.memos.splice(memo_id, 1);
			memo_id = (memo_id + wots.memos.length) % wots.memos.length;
			console.log("Move to and display next memo " + memo_id);
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
			console.log("Go to memo page: " + page);
			if (!wots.memos) {
				console.log("There is no array of memos");
				return 1;
			}
			if (wots.memos.length < page) {
				console.log("Array of memos is not long enough");
				return 1;
			}
			updateCurrentMemoId(page);
			var sensor = wots.memos[page];
			if (!sensor) {
				console.log("There is no sensor data at this page, go to next");
				return 2;
			}
			console.log("Display memo: " + JSON.stringify(sensor));
			var memo = sensor;
			//var memo = eval('(' + sensor.value + ')');
			//console.log("Memo", memo);
			$('#memoText').val(memo.text);
			$('#memoLocation').val(memo.location);
			if (!memo.author) memo.author = 'Een onbekende';
			$('#memoAuthor p').text(memo.author);
			if (!memo.title) memo.title = 'Welkom';
			$('#memoTitle p').text(memo.title);
			$('#memoAlert').val(memo.alert);
			$('#memoDate').val(memo.date);
			$('#memoRepeat').val(memo.repeat);
			setMemoColor(memo.color);
			return 0;
		}

		csCreateSensorDataSuccessCB = function(result) {
			if (!result) {
				//console.log("Adding sensor data should not result in a response, so this is fine");
				console.log("Reload sensor data from commonsense");
				loadSensorData();
				return;
			}
			console.log("Error?", result);
		};

		/**
		 * Get the data from the CommonSense database
		 */
		loadSensorData = function() {
			var param = {};
			var sensor_id = wots.sensor_id;
			if (!sensor_id) {
				console.log("Currently sensor id is not set yet, cannot load data");
				return;
			}
			sense.sensorData(sensor_id, param, loadSensorDataSuccessCB, generalErrorCB);
		};

		/**
		 * Update the data in wots.memos.
		 */
		loadSensorDataSuccessCB = function(result) {
			if (!result) {
				console.log("Error: no data returned, while it stated to be successful...");
				return;
			}
			console.log("Loading of sensor data from CommonSense is successful");

			// fill array with memo's
			var obj = eval('(' + result + ')');
			console.log("Store array of memos: " + JSON.stringify(obj));

			if (!obj.data) {
				console.log("Memo array should be wrapped into a data field");
				return;
			}

			for (m in obj.data) {
				var csmemo = obj.data[m];
				if (!csmemo.value) {
					console.error("Memo note should have a value object");
					continue;
				}
				var memo = eval('(' + csmemo.value + ')');
				wots.memos[memo.id] = memo;
				memo['data_id'] = csmemo.id;
			}
			//wots.memos = obj.data;

			if (!wots.memos) {
				console.log("Huh, memo object is empty");
				return;
			}
			console.log("Loaded " + wots.memos.length + " memos");

			// display new loaded data
			// displaySensorData(0);
			goThroughAlerts();

			//if (window.device.platform == androidPlatform) {
			//	setAllAlerts();
			//}  else if (window.device.platform == iOSPlatform) {
			//	console.log("FIXME: Need to call setAllAlerts() for iOS.");// FIXME
			//}
		};

		/*
		 * This makes sense if we have time-specific alerts. However, what we want is an alert that will be
		 * triggered if someone gets close to the fridge, just at the moment that he/she gets close to the 
		 * fridge. We do not want to figure out if someone is close to the fridge at a very specific time and
		 * then decide to send or not send something. What if someone was just putting the garbage outside and
		 * misses an alert in that way. That doesn't make sense. So, instead of setAllAlerts, we need only
		 * goThroughAlerts() to go through alerts and initiate them if their day is set today.
		 */
		setAllAlerts = function() {
			if (!window.plugin || !window.plugin.notification) {
				console.log("Cannot set alerts, plugin not installed");
				return;
			}
			for (m in wots.memos) {
				var memo = wots.memos[m];
				var now = new Date().getTime();
				var date = new Date(now + 60 * 1000); // one minute from now
				window.plugin.notification.local.add({
					id: memo.id,
					date: date,
					message: memo.text,
					title: memo.title,
					autoCancel: true}
				, function() {
					console.log("An alarm has been set off");
				});
			}
		}

		goThroughAlerts = function() {
			console.log("Go through current alerts");
			for (m in wots.memos) {
				var memo = wots.memos[m];
				if (memo.date && typeof memo.date != 'undefined') {
					console.log("Check if " + memo.date + " is today");
					var memo_arr = memo.date.split('-');
					console.log("Array length of date: " + memo_arr.length);
					if (memo_arr.length != 3) continue;
					var memo_year = Number(memo_arr[0]);
					var memo_month = Number(memo_arr[1]);
					var memo_day = Number(memo_arr[2]);
					var now = new Date();
					var year = now.getFullYear();
					var month = now.getMonth() + 1;
					var day = now.getDate();
					//console.log(memo_year + "vs" + year);
					//console.log(memo_month + "vs" + month);
					//console.log(memo_day + "vs" + day);
					if (memo_year == year && memo_month == month && memo_day == day) {
						console.log("Bingo, alert is for today!");
						createNotification(memo);
					}
				} else {
					console.log("Date undefined: " + memo.date);
				}
			}
		}

		createNotification = function(memo) {
			console.log("Create notification with alert type " + memo.alert);
			var now = new Date().getTime();
			var seconds = 10; // 10 seconds from now
			var date = new Date(now + seconds * 1000); 
			var json = JSON.stringify( memo );
			window.plugin.notification.local.add({
				id: memo.id,
				date: date,
				message: memo.text,
				title: memo.title,
				json: json,
				autoCancel: false
				}
				/* // callback does not seem to work
				, function() {
					console.log("An alarm has been set off");
					var m = JSON.parse(json);
					console.log("Json: " + m);
					if (m.alert == 'sound signal') {
						ble.writeAlertLevel('high', 3000);
					} else if (m.alert == 'flash LEDs') {
						ble.writeAlertLevel('middle', 5000);
					}
				}, json */
				);
		}

		setNotificationTriggers = function() {
			if (wots.platform === 'browser') return;

			window.plugin.notification.local.ontrigger = function(id, state, json) {
				for (m in wots.memos) {
					var memo = wots.memos[m];
					if (memo.id == id) {
						console.log("An alarm has been set off for memo " + memo.id);
						console.log("Also sound alarm on device itself " + memo.alert);
						if (memo.alert == 2) {
							ble.writeAlertLevel('high', 3000);
						} else if (memo.alert == 1) {
							ble.writeAlertLevel('middle', 5000);
						}
                        if (window.device.platform == iOSPlatform) {
                            navigator.notification.alert(
                                JSON.parse(json).text,
                                function(){}, // Specify a function to be called
                                JSON.parse(json).title,
                                "OK"
                            );
                            // I just asume here that on android the message already is displayed on the device.
                        }
						break;
					}
				}
			}
		}

		/*******************************************************************************************************
		 * Reset button
		 ******************************************************************************************************/

		$('#resetPage').on('pagecreate', function() {
			// should allow the user to reset his/her account
		});


		/**
		 * The more normal way to cope with a device that can be shared with multiple people is to use groups. 
		 * However, also this doesn't work in CommonSense. There is no easy way to add information to someone's
		 * else sensor.
		 */

		// Start the application automatically
		start();	
	}
}

