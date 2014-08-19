// Copied from http://jsfiddle.net/fegu/qGFZ6/
// Found here: http://www.gundersen.net/keep-ipadiphone-ios-keyboard-up-between-input-fields/
//
var Hangman = function() {
	var self = this;
	var hangman_length = 0;
	var submit_callback = null;

	self.generateHangman = function(length) {
		self.hangman_length = length;
		var totalWidth = 38;
		var padding = 'padding-left:0.2em;padding-right:0.2em;';
		var innerWidth = 20;
		if(length > 8) {
			totalWidth = 20;
			innerWidth = 15;
			padding = 'padding-left:0.0em;padding-right:0.0em;';
		}
		var startPos = (window.innerWidth / 2) - ((self.hangman_length * totalWidth) / 2);
		$(".hangman").remove();
		for(var c = 0; c < length; c++) {
			var leftPos = startPos + c * totalWidth;
			$("#hangmanTextInput")
				.append('<input id="h' + c  + '" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="hangman" value="" size="2" data-role="none" style="left:' + leftPos  + 'px;width:' + innerWidth + 'px;' + padding + '"></input>')
		}
		$(".hangman").keyup(function(event){return self.hangman_kpress(this,event,self.hangman_moveon_ipad);});
		$(".hangman").keydown (function(event){return self.hangman_kdn   (this,event,self.hangman_moveon_ipad);});
	}

	self.generateHangman1 = function(length) {
		self.hangman_length = length;
		var totalWidth = 38;
		var padding = 'padding-left:0.2em;padding-right:0.2em;';
		var innerWidth = 20;
		if(length > 8) {
			totalWidth = 25;
			innerWidth = 22;
			padding = 'padding-left:0.0em;padding-right:0.0em;';
		}
		var startPos = (window.innerWidth / 2) - ((self.hangman_length * totalWidth) / 2);
		$(".hangman").remove();
		for(var c = 0; c < length; c++) {
			var leftPos = startPos + c * totalWidth;
			$("#hangmanTextInput1")
				.append('<input id="h' + c  + '" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="hangman" value="" size="2" data-role="none" style="left:' + leftPos  + 'px;width:' + innerWidth + 'px;' + padding + '"></input>')
		}
		// keypress and keydown do not have event.which or event.keyCode set on Android, they are both 0
		$(".hangman").keyup(function(event){return self.hangman_kpress(this,event,self.hangman_moveon_ipad);});
		//$(".hangman").backbutton(function(event){return self.hangman_backpress(this,event,self.hangman_moveon_ipad);});
		//$(".hangman").bind('beforeinput', function(event){return self.hangman_kpress(this,event,self.hangman_moveon_ipad);});
		//$(".hangman").keydown (function(event){return self.hangman_kdn   (this,event,self.hangman_moveon_ipad);});
		//$(document).on('keyup','.hangman', function(event){return self.hangman_kpress(this,event,self.hangman_moveon_ipad);});
		//$(".hangman").keydown (function(event){return self.hangman_kdn   (this,event,self.hangman_moveon_ipad);});
		$(document).on('keydown','.hangman', function(event)   {return self.hangman_kdn      (this,event,self.hangman_moveon_ipad);});
		// this is button for previous page
		// $(document).on('backbutton','.hangman', function(event){return self.hangman_backpress(this,event,self.hangman_moveon_ipad);});
	}

	self.hangman_kdn = function(obj,ev,moveon){
		console.log("Handle key down ", ev);
		var kc = ev.charCode || ev.which || ev.keyCode;
/*		if (!kc) {
			var L = $(ev.target).val();
			if (L && L.length > 0) kc = L.charCodeAt(0);
		}*/
		//console.log("Key " + kc);
		//console.log("Print: " + $(ev.target).val() );
		var prefix = obj.id[0];
		var thisid = parseInt(obj.id.substring(1,obj.id.length));
		var previd = (thisid-1)%self.hangman_length;
		var nextid = (thisid+1)%self.hangman_length;
		if(previd < 0) previd += self.hangman_length;
		var evprevdef = true;
		if(kc == '8'){ $(obj).val(''); if(previd < thisid) moveon(obj,prefix+previd); }// BS
		else if(kc == '32'){ $(obj).val(' '); if(nextid > thisid) moveon(obj,prefix+nextid); }// SP (space is also a token)
		else if(kc == '37') moveon(obj, prefix+previd); // <-
		else if(kc == '39') moveon(obj, prefix+nextid); // ->
		else if(kc == '13') self.hangman_dosubmit(obj); // Enter, will not be captured by Android
		else {
			evprevdef = false;
		}

		if(evprevdef) ev.preventDefault();
		return !evprevdef;
	}
	
	self.hangman_backpress = function(obj,ev,moveon){
		console.log("Backbutton pressed");
		var prefix = obj.id[0];
		var thisid = parseInt(obj.id.substring(1,obj.id.length));
		var previd = (thisid-1)%self.hangman_length;
		moveon(obj, prefix+previd);
		ev.preventDefault();
		return false;
	}
	
	self.hangman_kpress = function(obj,ev,moveon){
		console.log("Handle key press ", ev);
		var k = ev.charCode || ev.which || ev.keyCode;
		// on android, none of the codes works, so get it indirectly via the value
		if (!k) {
			var L = $(ev.target).val();
			if (L && L.length > 0) k = L.charCodeAt(0);
		}
		var prefix = obj.id[0];
		var thisid = parseInt(obj.id.substring(1,obj.id.length));
		var nextid = (thisid+1)%self.hangman_length;
		if(k < 42){
			ev.preventDefault();
			return false;
		}

		var keypressed = String.fromCharCode(k).toUpperCase();
		//console.log("Key " + k + " pressed which is equal to " + keypressed);
		$(obj).val(keypressed);
		if(nextid > thisid) {
			moveon(obj,prefix+nextid);
		}
		ev.preventDefault();
		return false;
	}

	self.hangman_setsubmit = function(callback) {
		//console.log("Set callback to " + callback);
		self.submit_callback = callback;
	}

	self.hangman_dosubmit = function(obj) {
		if (self.submit_callback) {
			console.log("Call callback");
			var result = "";
			var length = self.hangman_length;
			for(var c = 0; c < length; c++) {
				result += $('.hangman#h' + c ).val();
			}
			self.submit_callback(obj, result);
		}
	}
	
	self.hangman_moveon_ipad = function(fromobj,toidx){
		//console.log("Move to new position");
		var toobj = $('#'+toidx);
		var t = $(toobj).val();
		$(toobj).val($(fromobj).val());
		$(fromobj).val(t);
		var t = $(toobj).css("left");
		$(toobj).css("left", ($(fromobj).css("left")));
		$(fromobj).css("left",t);

		var toobj2 = document.getElementById(toidx);
		var t = toobj2.id;
		var t2 = fromobj.id;
		toobj2.id = "dummy"; // to ensure no two objects having same id
		fromobj.id = t;
		toobj2.id = t2;
	}

	self.hangman_moveon_notablet = function(fromobj,toidx){
		var toobj = $('#'+toidx);
		toobj.focus();
	}

}
