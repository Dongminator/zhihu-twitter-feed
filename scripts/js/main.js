var api_key = "2440156431";
var redirect_url = "http://weibo-feed.herokuapp.com/auth";
var returned_data;
var query_default_string = "zhihu";
var bearer_token;

var next_query_params; // query parameters for the next result page when loading past tweets from multiple pages.
var tweet_ids = new Array();

var search_time;

var socket;

$(document).ready(function() {
	$('.navbar-form').submit(function(event){
		event.preventDefault();
		search_button_click_action();
	});
});

/*
 * Search button listener.
 * When clicked, display 15 past tweets.
 * If there is new tweets, display "New tweet" button.
 */
$('#search_button').on('click', function (e) {
	search_button_click_action();
});

/*
 * executed when button is clicked or Enter is pressed
 */
function search_button_click_action () {
	var query_string = $('#query').val();
	if (query_string) { // validate query string
		create_progress_bar();
		cleanup();
		search_time = new Date(); // get current time, format: Sun Mar 09 2014 22:54:47 GMT+0800 (China Standard Time)
		$('#comments').text(search_time);
		search_past_tweets_pg1(); // get past tweets
		stream_new_tweets(query_string); // get twitter stream (new tweets)
		progress_bar_increment_by(10);
	} else {
		// TODO use twitter alert box
		alert ("Please enter the topic you want to search.");
	}
}


/*
 * Search for the specific term for the first time using Twitter Search API. 
 * Need to obtain bearer token in this step. 
 * NEED TO FIGURE OUT: will bearer token expire?
 */
function search_past_tweets_pg1 () {
	$.get(
			"/twitter_login2", 
			function( data ) {
				var obj = JSON.parse(data);
				bearer_token = obj.access_token;
				
				var query_string = $('#query').val();// get query string from user input
				progress_bar_increment_by (70);
				search_query("?q=" + query_string);
			}
	);
}


function stream_new_tweets (query_string) {
	// TODO use Loading... before tweets are returned.
	if (!query_string) {
		console.log('query_string null. set to default string.');
		query_string = query_default_string; // this will never happen. 
	}
	$.get( "/search", { query_string : query_string } );
	establish_connection();
}

function search_query (query_string) {
	$.get(
			"/twitter_login3",
			{ bearer_token : bearer_token, q : query_string},
			function (data) {
				interpretPassedData (data);
				progress_bar_increment_by (70);
			}
	);
}


function establish_connection () {
	console.log("==establishing connection...==");
	$(function() {
	    socket = io.connect(window.location.hostname);
	    console.log(window.location.hostname);
	    socket.on('data', function(data) {
	    	// tweets coming back here. 
	    	interpretData(data);
	    });
	});
	
}


function interpretData (tweet_obj) {// 1 tweet per tweet_obj
	var tweet = tweet_obj.text;
	var tweet_id = tweet_obj.id;
	
	if (tweet_ids.indexOf(tweet_id)==-1) { // tweet ID is not in the tweet_id array => this tweet has not been processed before. REASON: Stream API return duplicated data!

		var created_At = tweet_obj.created_at;
		
		var user_obj = tweet_obj.user;
		var user_profile_image_url = user_obj.profile_image_url;
		var user_name = user_obj.name;
		var user_screen_name = user_obj.screen_name;
		
		tweet_ids.push(tweet_id);
		displayData(tweet_id, user_profile_image_url, user_name, user_screen_name, tweet, created_At);
	} else {
		console.log("repeated tweet! ignored.");
	}
	
}

// 1 tweet div looks like this:
//<div class="tweet" id="1123456">
//	<div class="user_name">
//		<a href="">
//			<img class="profile_photo" src="/files/test80.png" alt="Profile Photo" height="48" width="48"><!-- 48px is the image size returned by twitter stream api -->
//			<strong>Name</strong>
//			<span>@screenname</span>
//		</a>
//	</div>
//	<p>RT @_ManUtd_Indo: 2) #RETWEET tweet ini sebagai bukti kamu sudah mengikuti kuis TEBAK SKOR MANCHESTER UNITED V OLYMPIACOS #QTSMGSJersey </p>
//</div>

function displayData (id, imgUrl, name, screenname, text, time) {
	var tweet_div = $('<div></div>').addClass("tweet").attr('data-user-id', id);
	var user_div = $('<div></div>');
	var a_div = $('<a></a>').attr("href", imgUrl);// CHANGE: to user page
	var img = $('<img id="dynamic">').addClass("profile_photo").attr('src', imgUrl).appendTo(a_div);
	a_div.append( "<strong>" + name + "</strong>");
	var span = $('<span></span>').text(' @' + screenname + " " + time).appendTo(a_div);
	
	user_div.append(a_div);
	tweet_div.append(user_div);
	
	var p = $('<p></p>').text(text).appendTo(tweet_div);
	
	var insertAt = determineAppendIndex (id);// insert new tweet before indexAt. THIS IS ALWAYS UNDEFINED because currently unable to compare tweets IDs.
	console.log(insertAt);
	if (typeof insertAt != 'undefined') {
		console.log("aaa");
		tweet_div.insertBefore( $('#tweets').children().eq(insertAt) );
	} else { // if insertAt is undefined, it means there is nothing in #tweets div
		console.log("bb");
		if ($('#load_more_past_tweets')) {
			tweet_div.insertBefore( $('#load_more_past_tweets') );
		} else {
			$("#tweets").append(tweet_div);
		}
		
	}
	
}

function determineAppendIndex (id) {
	var tweetsDivs = document.getElementById("tweets").getElementsByClassName('tweet');
	for (var i = 0; i < tweetsDivs.length; i++) {
		var userId = tweetsDivs[i].getAttribute("data-user-id");
		var padLength = (id.length > userId.length) ? id.length : userId.length;
		var padId = pad(id, padLength);
		var padUserId = pad(userId, padLength);
		if (padId > padUserId) {
			return i;
		}
	}
}

/*
 * large number comparison: convert to string conparison, first make sure all string has the same length
 * source: http://stackoverflow.com/questions/13731292/compare-two-64-bit-integers-in-javascript
 */
function pad(str, len) { // Your fav. padding fn
    var pre = '0';
    len = len - str.length;
    while (len > 0) {
        if (len & 1) str = pre + str;
        len >>= 1;
        pre += pre;
    }
    return str;
};


/*
 * new tweets are fetched from Stream API
 * old tweets are fetched from Search API
 * therefore refresh_url will not be used. (refresh_url is implemented because data may change since last query)
 */
function interpretPassedData (data) {
	var statuses = data.statuses;
	var noOfStatuses = statuses.length;
	var search_metadata = data.search_metadata;
	
	if (noOfStatuses==15) {// there are more pages to load. (on condition that 15 is the number of tweets returned from each query.)
		next_query_params = search_metadata.next_results;
		// TODO: display "Load More Past tweets" button
		
		var loadMoreBtn = document.getElementById('load_more_past_tweets');
		if (!loadMoreBtn) {
			appendLoadMoreButton();
		}
		
	} else {
		var loadMoreBtn = document.getElementById('load_more_past_tweets');
		if (loadMoreBtn) {
			loadMoreBtn.parentNode.removeChild(loadMoreBtn);
			// TODO: append "No more tweet to load" text at the bottom of the page
		}
	}
	
	// Paging: https://dev.twitter.com/docs/working-with-timelines
	// refresh_url: because data may change since last query
	// next_result
	// use max_id: ((lowest ID of current request)-1) passed as max_id of the next request. (use -1 to avoid redundent tweet)
	for (var i = 0; i < noOfStatuses; i++) {
		var tweet_obj = statuses[i];
		interpretData (tweet_obj);
	}
}


function appendLoadMoreButton() {
	var loadMoreBtn = $('<button></button>').attr('type','button').attr('id','load_more_past_tweets').addClass('btn btn-default').text('Load more tweets');
	$('#tweets').append(loadMoreBtn);
	$('#load_more_past_tweets').on('click', function (e) {
		console.log("loading more tweets...");
		search_query(next_query_params);
	});
}

/*
 * If new search term is entered, this will be run.
 * 1. clear all contents in #tweets div
 * 2. clear tweet_ids array
 * 3. reconnect with Stream API
 * 4. disconnect socket
 */
function cleanup () {
	$("#tweets").empty();
	tweet_ids = new Array();
	progress_bar_increment_by (10);
}

function create_progress_bar() {
	var progressBarAll = $('<div></div>').addClass('progress');
	var progressBar = $('<div></div>').addClass('progress-bar').attr('id','progressBar').attr('role','progressbar').attr('aria-valuenow','0').attr('aria-valuemin','0').attr('aria-valuemax','100').attr('style','width: 0%;');
	var progressBarSpan = $('<span></span>').addClass('sr-only').text("Loading...");
	
	progressBar.append(progressBarSpan);
	progressBarAll.append(progressBar);
	
	console.log();
	$('#tweets').before(progressBarAll);
}

function progress_bar_increment_by (percent) {
	// get current percent
	// increment by "percent"
	// if reach 100, use 100
	var width = $('#progressBar').width();
	var parentWidth = $('#progressBar').offsetParent().width();
	var currPercent = 100*width/parentWidth;
	percent = percent + currPercent;
	
	if (percent >=100) {
		percent = 100;
		$( ".progress" ).fadeOut(1100);
		setTimeout(function (){
			$(".progress").remove();
        }, 1000);
	}
	$('#progressBar').attr('style','width: '+ percent+ '%;');
}

//<div class="progress">
//	<div class="progress-bar" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" style="width: 60%;">
//		<span class="sr-only">60% Complete</span>
//	</div>
//</div>
