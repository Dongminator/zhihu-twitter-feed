$(function(){// A function
	$("#submitButton").click(function(){//Get submitButton set on click function
		var searchString=$('#searchData').val();// get value of searchData
		//send string to server and get tweets back
		$.ajax({// ajax function:
			type: "POST",
			url: "/search",// => app.post('/search',...)
			data: "search=#"+searchString,// format:  key=value&key2=value
			success: function(data){// return data
				$('#tweets').html("");// set id=tweets in html code to be ""
				$.each(data['results'], function(index, result){// data.results
					// convert string and put on message queue
					console.log(result.created_at);
					$('#tweets').append("<p>"+result.text + " TIME:" + result.created_at + " location:" + result.coordinates + "  geo:"+result.geo + " fullname:");
					if(result.coordinates==null){
						$('#tweets').append(" location unavailable!" + "</p><br>");
					} else {
						$('#tweets').append(" location:" + result.coordinates + "</p><br>");
					}
				});
				$('#tweets').append("<br><b><a href=\"http://donglinpu.me\">Click here</a></b>");
			}
		});
	});
});