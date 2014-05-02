function WotsApp() {
	this.exhibitors = [];
	this.exhibitorsById = {};
	this.selectedExhibitorId = null;
}

WotsApp.prototype = {
	start:function() {
		var wots = this;

		$.ajaxSetup({ cache: false });

		$('#exhibitorListPage').on('pagecreate', function() {
			$.getJSON('data/exhibitors.js', function(data) {
				var exhibitorList = $('#exhibitorList');
				//$('#exhibitorList li').remove();
				wots.exhibitors = data;
				var prevExhibitor = null;
				var nextExhibitor = null;
				var nextNextExhibitor = null;
				var pastSomeDone = false;
				for(var c = 0; c < wots.exhibitors.length; c++) {
					var exhibitor = wots.exhibitors[c];
					if(typeof exhibitor.status == 'undefined')
						exhibitor.status = "open";
					if(typeof exhibitor.oneliner == 'undefined')
						exhibitor.oneliner = '';
				}
				for(var c = 0; c < wots.exhibitors.length; c++) {
					var exhibitor = wots.exhibitors[c];
					wots.exhibitorsById[exhibitor.id] = exhibitor;
					if(c + 1 < wots.exhibitors.length)
						nextExhibitor = wots.exhibitors[c + 1];
					else
						nextExhibitor = null;
					if(c + 2 < wots.exhibitors.length)
						nextNextExhibitor = wots.exhibitors[c + 2];
					else
						nextNextExhibitor = null;
					var doneClass = "";
					var enabledClass = "taskDisabled";
					if(exhibitor.status == "done") {
						pastSomeDone = true;
						enabledClass = 'taskEnabled';
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
					}
					else {
						if(pastSomeDone || nextExhibitor && nextExhibitor.status == "done")
							enabledClass = "taskEnabled";
						else {
							if(nextNextExhibitor && nextNextExhibitor.status == "done")
								enabledClass = "taskHalfEnabled";
						}
					}
					$(exhibitorList).append($('<li/>', { "class":doneClass + ' ' + enabledClass })
						//.append($('<div/>')).
						.append($('<a/>', {
							'href':'#exhibitorDetailsPage',
							'data-transition':'slide',
							'data-id':exhibitor.id
						})
						.append('<span>' + exhibitor.name + '</span>')
						.append('<p>' + exhibitor.oneliner + '</p>'))
						//append($('<p>oneliner</p>'))
					);
					prevExhibitor = exhibitor;
				} // End for-loop
				$('#exhibitorList').listview('refresh');
			});
		});

		$('#exhibitorList').on('click', 'li a', function(event) {
			wots.selectedExhibitorId = $(this).attr('data-id');
			$.mobile.changePage("#exhibitorDetailsPage", {transition:'slide', hashChange:true});
			event.preventDefault();
		});


		$('#exhibitorDetailsPage').on("pagebeforeshow", function( event, ui ) {
				var exhibitor = wots.exhibitorsById[wots.selectedExhibitorId];
				if(exhibitor) {
					if(exhibitor.logo)
						$('#exhibitorLogo').attr('src', 'logos/600-width/' + exhibitor.logo);
					if(exhibitor.name)
						$('#exhibitorDetailsPage .ui-title').text(exhibitor.name);

					if(exhibitor.questions) {
						if(typeof exhibitor.activeQuestion == 'undefined') {
							var index = Math.floor(Math.random() * exhibitor.questions.length);
							exhibitor.activeQuestion = exhibitor.questions[index];
						}
						var questionText = "Er is geen vraag gevonden.";
						if(typeof exhibitor.activeQuestion != 'undefined') {
							questionText = exhibitor.activeQuestion.question;
							generateHangman(exhibitor.activeQuestion.type, exhibitor.activeQuestion.length);
						}
						$('#questionParagraph').text(questionText);

					}
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


/*
				$('#hangmanTextInput input').on('keydown',  function(event) {
					var keyChar = event.which;
					console.log("keypress: " + keyChar);
					if(keyChar == 8) {
						var lastElement = null;
						$('#hangmanTextInput input').each(function(index, element) {
							if(element == event.target) {
								if(lastElement) {
									$(lastElement).val('');
									$(lastElement).trigger('touchstart');
								}
							}
							lastElement = element;
						});
					}
				});
*/
		});

		$('#virtualMemoPage').on('swiperight', function(event) {
			$('#virtualMemoPanel').panel("open");
		});

		$('#virtualMemoPage').on('pageshow',function(e,data){    
				var windowHeight = $(window).height();
				var headerHeight = $('[data-role=header]').height();
				var footerHeight = $('.ui-footer').height();
				var memoHeight = $('#memoNote').outerHeight();
				//var marginTop = (windowHeight - headerHeight - footerHeight - memoHeight)/2;
				var marginTop = (windowHeight - memoHeight - footerHeight)/2;
				console.log('windowHeight: ' + windowHeight + ', headerHeight: ' + headerHeight + ', footerHeight: ' + footerHeight + ', memoHeight: ' + memoHeight + ', marginTop: ' + marginTop);
			  $('#memoNote').css('margin-top',marginTop);
		});
	}
}

