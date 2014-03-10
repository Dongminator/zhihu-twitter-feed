var api_key = "2440156431";
var query_default_string = "zhihu";
var bearer_token;

var next_query_params; // query parameters for the next result page when loading past tweets from multiple pages.
var tweet_ids = new Array(); // All tweets IDs on the page.

var search_time;// the time search button is clicked. 

var socket;

$(document).ready(function() {
	/*
	 * When Enter is pressed in 'input', only want to execute search function, as if the 'search' button is clicked. 
	 * preventDefault(): so page wont reload, url wont be changed to /?q=
	 */
	$('.navbar-form').submit(function(event){
		event.preventDefault();
		search_button_click_action();
	});
});

/*
 * Search button listener.
 * When clicked, display 15 past tweets. (15 is the default number. )
 */
$('#search_button').on('click', function (e) {
	search_button_click_action();
});

/*
 * run when a hashtag (e.g. #zhihu) is created. 
 */
function addHashtagListener (hashtagSpan) {
	/*
	 * when a hashtag clicked, run new query and rerender the page as if "search" button is clicked with new query string.
	 */
	hashtagSpan.addEventListener('click', function(e){
		var hashtag = hashtagSpan.innerHTML;
		$('#query').val(hashtag);
		search_button_click_action();
	});
}	


/*
 * executed when Search button is clicked, Enter key is pressed in the input field, or when a hashtag (e.g. #zhihu) is clicked
 */
function search_button_click_action () {
	var query_string = $('#query').val(); 
	query_string = $.trim(query_string);
	$('#query').val(query_string);
	
	query_string = encodeURIComponent(query_string); // UTF-8, URL-encoded
	
	if (query_string) { // validate query string
		create_progress_bar();
		cleanup();
		search_time = new Date(); // get current time, format: Sun Mar 09 2014 22:54:47 GMT+0800 (China Standard Time)
		search_past_tweets_pg1(query_string); // get past tweets
		stream_new_tweets(query_string); // get twitter stream (new tweets)
		progress_bar_increment_by(10);
	} else {
		// TODO use twitter alert box
		alert ("Please enter the topic you want to search.").alert();
	}
}


/*
 * Search for the specific term for the first time using Twitter Search API. 
 * This is the function for obtaining bearer token. 
 * TODO NEED TO FIGURE OUT: will bearer token expire?
 */
function search_past_tweets_pg1 (query_string) {
	$.get(
			"/twitter_login2", 
			function( data ) {
				var obj = JSON.parse(data);
				bearer_token = obj.access_token;
				
				progress_bar_increment_by (70);
				search_query("?q=" + query_string);
			}
	);
}

/*
 * Use Twitter Stream API to stream live tweets given a specific term.
 */
function stream_new_tweets (query_string) {
	if (!query_string) {
		// query_string null. set to default string.
		query_string = query_default_string; // this will never happen. 
	}
	$.get( "/search", { query_string : query_string } );
	establish_connection();
}

/*
 * This is the actual use of Search API.
 */
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

/*
 * Establish Socket connection to receive live stream tweets from server.
 */
function establish_connection () {
	//	establishing connection
	$(function() {
	    socket = io.connect(window.location.hostname);
	    socket.on('data', function(data) {
	    	// tweets coming back here. 
	    	interpretData(data);
	    });
	});
	
}

/*
 * interpret tweets from both Stream API and Search API
 */
function interpretData (tweet_obj) {// 1 tweet per tweet_obj
	var tweet = tweet_obj.text;
	var tweet_id = tweet_obj.id;
	
	if (tweet_ids.indexOf(tweet_id)==-1) { // tweet ID is not in the tweet_id array => this tweet has not been processed before. REASON: Stream API return duplicated data!

		var created_At = tweet_obj.created_at;
		var hashtags = tweet_obj.entities.hashtags;
		var user_mentions = tweet_obj.entities.user_mentions;
		var urls = tweet_obj.entities.urls;
		var imgs = tweet_obj.entities.media;
		
		var user_obj = tweet_obj.user;
		var user_profile_image_url = user_obj.profile_image_url;
		var user_name = user_obj.name;
		var user_screen_name = user_obj.screen_name;
		
		var urlSubs = {};
		for (var i = 0; i < urls.length; i++) {
			var url = urls[i].url;
			var display_url = urls[i].display_url;
			var expanded_url = urls[i].expanded_url;
			urlSubs[url] = [display_url, expanded_url];
		}
		
		var hashtagSubs = new Array();
		for (var i = 0; i < hashtags.length; i++) {
			var text = hashtags[i].text;
			hashtagSubs.push(text);
		}
		
		var user_mentionsSubs = new Array();
		for (var i = 0; i < user_mentions.length; i++) {
			var screen_name = user_mentions[i].screen_name;
			user_mentionsSubs.push(screen_name);
		}
		
		var img;
		if (imgs && imgs.length > 0) {
			img = imgs[0];
			
			var url = img.url;
			var display_url = img.display_url;
			var expanded_url = img.expanded_url;
			urlSubs[url] = [display_url, expanded_url];
		}
		
		tweet_ids.push(tweet_id);
		displayData(tweet_id, user_profile_image_url, user_name, user_screen_name, tweet, created_At, urlSubs, hashtagSubs, user_mentionsSubs, img);
	} else {
		//	repeated tweet! ignored.
	}
	
}

// 1 tweet div looks like this:
//<div class="tweet" data-user-id="1123456">
//	<div>
//		<a href="">
//			<img class="profile_photo" src="/files/test80.png" alt="Profile Photo" height="48" width="48"><!-- 48px is the image size returned by twitter stream api -->
//			<strong>Name</strong>
//			<span>@screenname</span>
//		</a>
//	</div>
//	<p>#zhihu test 2</p>
// 	<a href="twipic.html"><img src="img.jpg"></a>
//</div>

/*
 * Display tweets
 */
function displayData (id, imgUrl, name, screenname, text, time, urlSubs, hashtagSubs, user_mentionsSubs, tweetImg) {
	var tweet_div = $('<div></div>').addClass("tweet").attr('data-user-id', id);
	tweet_div.mouseover(function() {
		$( this ).addClass('hover');
	});
	
	var user_div = $('<div></div>');
	var a_div = $('<a></a>').attr("href", "https://twitter.com/" + screenname).attr("target","_blank").addClass("name");// CHANGE: to user page
	var profileImg = $('<img id="dynamic">').addClass("profile_photo").attr('src', imgUrl).appendTo(a_div);
	a_div.append( "<strong>" + name + "</strong>");
	var span = $('<span></span>').text(' @' + screenname + " " + time).appendTo(a_div);
	
	user_div.append(a_div);
	tweet_div.append(user_div);
	
	var p = $('<p></p>').append(subLink(text, urlSubs, hashtagSubs, user_mentionsSubs)).appendTo(tweet_div);
	
	if (tweetImg) {
		expanded_url = tweetImg.expanded_url;
		media_url = tweetImg.media_url;
		
		var imgATag = $('<a></a>').attr("href", expanded_url).attr("target","_blank").addClass("tweetImg");
		var img = $('<img>').attr('src', media_url).appendTo(imgATag);
		tweet_div.append(imgATag);
	}

	// hashtags listeners have to be added here. can't add in subLink, because replace the hashtags strings so listeners will be lost.
	var hashtags = p.find(".hashtag");
	for (var i = 0; i < hashtags.length; i++) {
		addHashtagListener (hashtags[i]);
	}
	
	var insertAt = determineAppendIndex (id);// insert new tweet before indexAt. THIS IS ALWAYS UNDEFINED because currently unable to compare tweets IDs.
	if (typeof insertAt != 'undefined') {
		tweet_div.insertBefore( $('#tweets').children().eq(insertAt) );
	} else { // if insertAt is undefined, it means there is nothing in #tweets div
		if ($('#load_more_past_tweets')) {
			tweet_div.insertBefore( $('#load_more_past_tweets') );
		} else {
			$("#tweets").append(tweet_div);
		}
	}
}

/*
 * substitute #.., @.., http://... with <a>#...</a>, <a>@...</a>, etc
 * urlsubs {
 * 	url: [display, expand]
 * }
 * hashtagSubs: [tag1, tag2]
 * user_mentionsSubs: [mention1, mention2]
 */
function subLink(text, urlSubs, hashtagSubs, user_mentionsSubs) {
	var final_text = text;
	
	for (var i = 0; i < hashtagSubs.length; i++) {
		var innerText = "#" + hashtagSubs[i];
		var span = document.createElement('span');
		span.className = "hashtag";
		span.innerHTML = innerText;
		
		var tmp = document.createElement("div");
		tmp.appendChild(span);
		
		final_text = final_text.replace(innerText, tmp.innerHTML);
	}
	
	for (var i = 0; i < user_mentionsSubs.length; i++) {
		var innerText = "@" + user_mentionsSubs[i];
		var a = document.createElement('a');
		a.href = "https://twitter.com/" + user_mentionsSubs[i];
		a.innerHTML = innerText;
		a.target = "_blank";
		
		var tmp = document.createElement("div");
		tmp.appendChild(a);
		
		final_text = final_text.replace(innerText, tmp.innerHTML);
	}
	
	for (var key in urlSubs) {
		var url = key;
		var display = urlSubs[key][0];
		var expand = urlSubs[key][1];
		
		var a = document.createElement('a');
		a.href = expand;
		a.innerHTML = display;
		a.target = "_blank";
		
		var tmp = document.createElement("div");
		tmp.appendChild(a);
		final_text = final_text.replace(url, tmp.innerHTML);
	}
	
	return final_text;
}

/*
 * Determine the index of where to insert next tweet.
 * Note: Tweets returned from Stream API may not be ordered, and have redundent tweets.
 */
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
 * Large number comparison: convert to string conparison, first make sure all string has the same length
 * Source: http://stackoverflow.com/questions/13731292/compare-two-64-bit-integers-in-javascript
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
 * Interpret data returned from Twitter Search API. 
 */
function interpretPassedData (data) {
	var statuses = data.statuses;
	var noOfStatuses = statuses.length;
	var search_metadata = data.search_metadata;

	if (noOfStatuses==15) {// there are more pages to load. (on condition that 15 is the number of tweets returned from each query.)
		next_query_params = search_metadata.next_results;
		
		var loadMoreBtn = document.getElementById('load_more_past_tweets');
		if (!loadMoreBtn) {
			appendLoadMoreButton();
		} else {
			loadMoreBtn.disabled = false;
			loadMoreBtn.firstChild.data = "Click to load more tweets.";
		}
		
	} else {
		var loadMoreBtn = document.getElementById('load_more_past_tweets');
		if (loadMoreBtn) {
			loadMoreBtn.disabled = true;
			loadMoreBtn.firstChild.data = "No more tweet to load.";
		}
	}
	
	// Paging: https://dev.twitter.com/docs/working-with-timelines
	// refresh_url will not be used. (refresh_url is implemented because data may change since last query but new tweets are fetched from Stream API in this app)
	// next_result is the query parameters for the next query.
	// use max_id: ((lowest ID of current request)-1) passed as max_id of the next request. (use -1 to avoid redundent tweet)
	for (var i = 0; i < noOfStatuses; i++) {
		var tweet_obj = statuses[i];
		interpretData (tweet_obj);
	}
}

/*
 * Append "Click to load more tweets." button
 * when clicked, disable button and change text to "Loading..."
 * when loading finished, enable button and change text to "Click to load more tweets." this step is performed in interpretPassedData (data)
 */
function appendLoadMoreButton() {
	var loadMoreBtn = $('<button></button>').attr('type','button').attr('id','load_more_past_tweets').addClass('btn btn-primary').text('Click to load more tweets.').attr("style", "width: 100%;");
	$('#tweets').append(loadMoreBtn);
	$('#load_more_past_tweets').on('click', function (e) {
		$(this).text("Loading...");
		$(this).prop('disabled', true);
		search_query(next_query_params);
	});
}

/*
 * If new search term is entered, this will be run.
 * 1. clear all contents in #tweets div
 * 2. clear tweet_ids array
 */
function cleanup () {
	$("#tweets").empty();
	tweet_ids = new Array();
	progress_bar_increment_by (10);
}

/*
 * When a new term is being searched, this will be shown.
 */
function create_progress_bar() {
	var progressBarAll = $('<div></div>').addClass('progress');
	var progressBar = $('<div></div>').addClass('progress-bar').attr('id','progressBar').attr('role','progressbar').attr('aria-valuenow','0').attr('aria-valuemin','0').attr('aria-valuemax','100').attr('style','width: 0%;');
	var progressBarSpan = $('<span></span>').addClass('sr-only').text("Loading...");
	
	progressBar.append(progressBarSpan);
	progressBarAll.append(progressBar);
	
	$('#tweets').before(progressBarAll);
}

/*
 * Progress bar increment by x% until 100%.
 * Remove progress bar 1 second after reaching 100%.
 */
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

// Progress bar HTMl:
//<div class="progress">
//	<div class="progress-bar" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" style="width: 60%;">
//		<span class="sr-only">60% Complete</span>
//	</div>
//</div>
