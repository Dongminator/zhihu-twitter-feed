var api_key = "2440156431";
var redirect_url = "http://weibo-feed.herokuapp.com/auth";
var returned_data;
var query_default_string = "zhihu";

$(document).ready(function(){
	
});

$('#search_button').on('click', function (e) {
	var query_string = $('#user_query').val();
	
	if (query_string) {
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
//	establish_connection();
}


function establish_connection () {
	console.log("==establishing connection...==");
	$(function() {
	    var socket = io.connect(window.location.hostname);
	    console.log(window.location.hostname);
	    socket.on('data', function(data) {
	    	// tweets coming back here. 
//			var obj = JSON.parse(data);
	    	console.log(data);
	    });
	});
	
}


function displayData (tweet_obj) {
	var tweet = tweet_obj.text;
	var user_obj = tweet_obj.user;
	var user_statuses_count = user_obj.statuses_count;
	var user_profile_image_url = user_obj.profile_image_url;
}