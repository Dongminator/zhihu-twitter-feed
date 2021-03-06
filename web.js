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

app.use(express.bodyParser());

app.use('/scripts', express.static('scripts'));
app.use('/files', express.static('files'));

app.get('/', function(request, response) {
	response.sendfile(__dirname+'/index.html');
});

/*
 * https://dev.twitter.com/docs/auth/application-only-auth 
 * Step 2: obtain a bearer token
 */
app.get('/twitter_login2', function(request, response){
	var headers = { 
		    'Authorization': 'Basic ' + credentials.base64,
		    'Content-Type' : 'application/x-www-form-urlencoded;charset=UTF-8' 
	};
	var options = {
			  hostname: 'api.twitter.com',
			  path: "/oauth2/token",
			  method: 'POST',
			  headers: headers
	};
	
	var req = https.request(options, function(res) {
		res.on('data', function (chunk) {
			response.send(chunk);
		});
	});
	
	req.write('grant_type=client_credentials');
	req.end();
});

/*
 * Step 3: Authenticate API requests with the bearer token
 * twitter_login3 is the actual query. need to rename it to query or something else.
 * Search API: https://stream.twitter.com/1.1/statuses/filter.json
 */
app.get('/twitter_login3', function(request, response){
	var bearer_token = request.param('bearer_token');
	var query_string = request.param('q');
	
	// !! Do not forget to add "Bearer " before bearer_token!!!
	var headers = { 
		    'Authorization': "Bearer " + bearer_token,
	};
	
	var options = {
			hostname: 'api.twitter.com',
			path: '/1.1/search/tweets.json' + query_string, // query_string already has "?q="
			method: 'GET',
			headers: headers
	};
	var body = "";
	var req = https.request(options, function(res) { // res is IncomingMessage help: http://nodejs.org/api/http.html#http_http_incomingmessage
		// res.statusCode
		res.setEncoding("utf8");
		res.on('data', function (chunk) {// this happens multiple times! So need to use 'body' to collect all data
			body += chunk;
		});
		
		var data="";
		res.on('end', function () { // when we have full 'body', convert to JSON and send back to client.
			try {
				data = JSON.parse(body);
		    } catch (er) {
		    	// something wrong with JSON
		    	response.statusCode = 400;
		    	return response.end('error: ' + er.message);
		    }

		    // write back response json
		    response.send(data);
		    response.end();
		  });
	});
	req.end();
});

// user twitter stream api.
app.get('/search', function(request, response){
	var query_string = request.param('query_string');
	t.stream('statuses/filter', { track: query_string }, function(stream) {
		stream.on('data', function(tweet) {
			if (tweet.text !== undefined) {
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



