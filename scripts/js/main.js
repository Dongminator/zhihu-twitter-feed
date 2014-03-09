var api_key = "2440156431";
var redirect_url = "http://weibo-feed.herokuapp.com/auth";
var returned_data;
var query_default_string = "zhihu";

var tweet_ids = new Array();

var search_time;

$(document).ready(function(){
	
});

$('#search_button').on('click', function (e) {
	search_time = new Date();
	console.log(search_time);
	
	$('#comments').text(search_time);
	
	var query_string = $('#query').val();
	
	if (query_string) {
		console.log(query_string);
		query(query_string);
	} else {
		// @TODO use twitter alert box
		alert ("Please enter the topic you want to search.");
	}
});

$('#twitter_login_button').on('click', function (e) {
	console.log("twitter login clicked");
	query();
    //your awesome code here
	
//	//https://api.weibo.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REGISTERED_REDIRECT_URI
//	//https://api.weibo.com/oauth2/authorize?client_id=2440156431&redirect_uri=http://weibo-feed.herokuapp.com/auth&response_type=code
//	// return this: /auth?code=5c3b0ae0fea360c901fd9956a0507fa7 => access token
//	$.get(
//			"/twitter_login2", 
////			{ client_id : api_key, response_type : "code", redirect_uri : redirect_url }, 
//			function( data ) {
//				returned_data = data;
//				console.log(data);
////				window.open();
//				var obj = JSON.parse(data);
//				returned_data = obj;
//
//				query(data);
////				var bearer_token = obj.access_token;
////				console.log(bearer_token);
////				$.get(
////						"/twitter_login3",
////						{ bearer_token : bearer_token },
////						function (data) {
////							console.log(data);
////						}
////				);
//			}
//	); // if use json, will have "No 'Access-Control-Allow-Origin' header is present on the requested resource." problem.
//	console.log("processed");
	
//	$.get( "search" );

});
// http://api.weibo.com/2/statuses/public_timeline.json?source=2440156431

// 127.0.0.1:3000/search?q=abc

function query (query_string) {
	// @TODO use Loading... before tweets are returned.
	if (!query_string) {
		console.log('query_string null. set to default string.');
		query_string = query_default_string; // this will never happen. 
	}
	$.get(
			"/search",
			{ query_string : query_string },
			function (data) {
				establish_connection();
//				var obj = JSON.parse(data);
//				returned_data = obj;
//				console.log(data);
			}
	);
	establish_connection();
}


function establish_connection () {
	console.log("==establishing connection...==");
	$(function() {
	    var socket = io.connect(window.location.hostname);
	    console.log(window.location.hostname);
	    socket.on('data', function(data) {
	    	// tweets coming back here. 
	    	interpretData(data);
	    });
	});
	
}


function interpretData (tweet_obj) {
	var tweet = tweet_obj.text;
	var tweet_id = tweet_obj.id;
	
	if (tweet_ids.indexOf(tweet_id)==-1) {

		var created_At = tweet_obj.created_at;
		
		var user_obj = tweet_obj.user;
		var user_statuses_count = user_obj.statuses_count;
		var user_profile_image_url = user_obj.profile_image_url;
		var user_name = user_obj.name;
		var user_screen_name = user_obj.screen_name;
		
		
		console.log(tweet_id);
		console.log(created_At);
		console.log(user_profile_image_url);
		console.log(tweet);
		console.log(user_name + " " + user_screen_name);
		
		
		
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
	
	
	var insertAt = determineAppendIndex (id);// insert new tweet before indexAt
	console.log (insertAt);
	
	
//	var isNewTweet = determineNewTweet (time);
	
//	$('#tweets').append(tweet_div);
	
	tweet_div.insertBefore( $('#tweets').children().eq(insertAt) );
}

function determineAppendIndex (id) {
	var tweetsDivs = document.getElementById("tweets").getElementsByClassName('tweet');
	for (var i = 0; i < tweetsDivs.length; i++) {
		var userId = tweetsDivs[i].getAttribute("data-user-id");
		if (id > userId) {
			return i;
		}
	}
}
