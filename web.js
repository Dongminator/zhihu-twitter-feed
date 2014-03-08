var express = require('express');// Use 'express' library

var app = express();
var http = require('http');
var https = require('https');

var twitter = require('ntwitter');
var credentials = require('./scripts/js/credentials.js');

var server = http.createServer(app);

var io = require('socket.io').listen(server);

// Create credentials
var t = new twitter({
    consumer_key: credentials.consumer_key,
    consumer_secret: credentials.consumer_secret,
    access_token_key: credentials.access_token_key,
    access_token_secret: credentials.access_token_secret
});

//t.stream(
//    'statuses/filter',
//    { track: ['awesome', 'cool', 'rad', 'gnarly', 'groovy'] },
//    function(stream) {
//        stream.on('data', function(tweet) {
//            console.log(tweet.text);
//        });
//    }
//);


app.use(express.bodyParser());

app.use('/scripts', express.static('scripts'));
app.use('/files', express.static('files'));

app.get('/', function(request, response) {
	response.sendfile(__dirname+'/index.html');
});

app.post('/search', function(request, response) {
	t.search(request.body['search'], {},function(error, data){
		response.send(data);
	});
});


app.get('/twitter_login2', function(request, response){
	console.log("=login Step 2: Obtain a bearer token=");
	var headers = { 
		    'Authorization': 'Basic cEFnOWRWQU9Bbnc3Zm01WFlBZDRCUTpMaUV5Y3VzZE5lNkZodkUyRWdXZU10V1VKcGtvNU5BNWI4M09YRmNyekY0',
		    'Content-Type' : 'application/x-www-form-urlencoded;charset=UTF-8' 
	};
	var options = {
			  hostname: 'api.twitter.com',
			  path: "/oauth2/token",
			  method: 'POST',
			  headers: headers
			  
	};
	
	var req = https.request(options, function(res) {
		console.log('STATUS: ' + res.statusCode);
		res.on('data', function (chunk) {
			response.send(chunk);
		});
	});
	
	req.write('grant_type=client_credentials');
	req.end();
});

/*
 * twitter_login3 is the actual query. need to rename it to query or something else.
 */
app.get('/twitter_login3', function(request, response){
	console.log("=login Step 3: Authenticate API requests with the bearer token=");
	var bearer_token = request.param('bearer_token');
	console.log(bearer_token);
	// !! Do not forget to add "Bearer " before bearer_token!!!
	var headers = { 
		    'Authorization': "Bearer " + bearer_token,
	};
	
	// https://stream.twitter.com/1.1/statuses/filter.json
	var options = {
//			  hostname: 'api.twitter.com',
//			  path: "/1.1/search/tweets.json?q=manchester",
//			  method: 'GET',
			  
			hostname: 'stream.twitter.com',
			path: '/1.1/statuses/filter.json',
			method: 'POST',
			  
			  headers: headers
	};
	
	var req = https.request(options, function(res) {
		console.log('STATUS: ' + res.statusCode);
		res.on('data', function (chunk) {
			response.send(chunk);
		});
	});
	
	req.write('track=twitter');
	req.end();
});

app.get('/search', function(request, response){
	var query_string = request.param('query_string');
	console.log("query_string = " + query_string);
	t.stream('statuses/filter', { track: query_string }, function(stream) {
		stream.on('data', function(tweet) {
			if (tweet.text !== undefined) {
				console.log("====" + tweet.text);
				response.send(tweet.text);
				io.sockets.emit('data', tweet);
			}
		});
	});
	
});

var port = process.env.PORT || 3000;
server.listen(port, function() {
  console.log("Listening on " + port);
});



