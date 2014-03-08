var api_key = "2440156431";
var returned_data;
$(document).ready(function(){
	console.log("== getting public weibo ==");
	getPublicWeibo();
    console.log("== got public weibo ==");
});

/*
 * 获取最新公共微博
 * https://api.weibo.com/2/statuses/public_timeline.json?source=2440156431
 */
function getPublicWeibo () {
//	$.get( "api.weibo.com/2/statuses/public_timeline.json", { source: api_key } );

	console.log("processing...");
	$.get( "http://api.weibo.com/2/statuses/public_timeline.json", { source: api_key }, function( data ) {
		returned_data = data;  
		console.log(data);
		console.log(data.data.statuses.length);
		}, "jsonp" ); // if use json, will have "No 'Access-Control-Allow-Origin' header is present on the requested resource." problem.
	console.log("processed");
	
	
}


function getWeiboByTopic (topic) {
	
}