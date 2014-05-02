// Copied from http://jsfiddle.net/fegu/qGFZ6/
// Found here: http://www.gundersen.net/keep-ipadiphone-ios-keyboard-up-between-input-fields/
//
var hangman_length = 0;

function generateHangman(type, length) {
	hangman_length = length;
	var totalWidth = 38;
	var padding = 'padding-left:0.2em;padding-right:0.2em;';
	var innerWidth = 20;
	if(length > 8) {
		totalWidth = 20;
		innerWidth = 15;
		padding = 'padding-left:0.0em;padding-right:0.0em;';
	}
	var startPos = (window.innerWidth / 2) - ((hangman_length * totalWidth) / 2);
	$(".hangman").remove();
	for(var c = 0; c < length; c++) {
		var leftPos = startPos + c * totalWidth;
		$("#hangmanTextInput")
			.append('<input id="h' + c  + '" type="text" class="hangman" value="" size="2" data-role="none" style="left:' + leftPos  + 'px;width:' + innerWidth + 'px;' + padding + '"></input>')
	}
	$(".hangman").keypress(function(event){return hangman_kpress(this,event,hangman_moveon_ipad);});
	$(".hangman").keydown (function(event){return hangman_kdn   (this,event,hangman_moveon_ipad);});
	//var hangman_count = $(".hangman").size();
	//$(".hangman").each(function(index, element) {
		//element.id = "h" + index;
		//$(element).css({ left: startPos + index * width } );
		//hangman_length++;
	//});
}

//$(".b").keypress(function(event){return hangman_kpress(this,event,hangman_moveon_notablet);});
//$(".b").keydown (function(event){return hangman_kdn   (this,event,hangman_moveon_notablet);});

function hangman_kdn(obj,ev,moveon){
	var kc = ev.keyCode;
    var prefix = obj.id[0];
	var thisid = parseInt(obj.id.substring(1,obj.id.length));
	var previd = (thisid-1)%hangman_length;
	var nextid = (thisid+1)%hangman_length;	
	if(previd < 0) previd += hangman_length;
	var evprevdef = true;
	if(kc == '8'){ $(obj).val(''); if(previd < thisid) moveon(obj,prefix+previd); }// BS
	else if(kc == '32'){ $(obj).val(''); if(nextid > thisid) moveon(obj,prefix+nextid); }// SP
	else if(kc == '37') moveon(obj, prefix+previd); // <-
	else if(kc == '39') moveon(obj, prefix+nextid); // ->
	else if(kc == '13') hangman_dosubmit(); // Enter
	else {
		evprevdef = false;
	}

	if(evprevdef) ev.preventDefault();
 	return !evprevdef;
}

function hangman_dosubmit(){
    alert("Submit to server");
}


function hangman_moveon_ipad(fromobj,toidx){
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

function hangman_moveon_notablet(fromobj,toidx){
    var toobj = $('#'+toidx);
    toobj.focus();
}

function hangman_kpress(obj,ev,moveon){
	var k = ev.which;
    var prefix = obj.id[0];
	var thisid = parseInt(obj.id.substring(1,obj.id.length));
	var nextid = (thisid+1)%hangman_length;
	if(k < 42){
		ev.preventDefault();
		return false;
	}

	var keypressed = String.fromCharCode(k).toUpperCase();
	$(obj).val(keypressed);
	if(nextid > thisid) {
		moveon(obj,prefix+nextid);
	}
	ev.preventDefault();
	return false;
}

