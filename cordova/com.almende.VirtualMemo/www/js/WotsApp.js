function WotsApp() {
	this.exhibitors = [];
	this.exhibitorsById = {};
	this.selectedExhibitorId = null;
}

WotsApp.prototype = {
	start:function() {
		var wots = this;

		$('#exhibitorListPage').on('pagecreate', function() {
			$.getJSON('data/exhibitors.js', function(data) {
				var exhibitorList = $('#exhibitorList');
				//$('#exhibitorList li').remove();
				wots.exhibitors = data;
				wots.exhibitors.forEach(function(exhibitor) {
					wots.exhibitorsById[exhibitor.id] = exhibitor;
					$(exhibitorList).append($('<li/>').
						append($('<a/>', {
							'href':'#exhibitorDetailsPage',
							'text':exhibitor.name,
							'data-transition':'slide',
							'data-id':exhibitor.id
						})));
				}, wots);
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

				}
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

