var credentials = {
	  consumer_key: 'pAg9dVAOAnw7fm5XYAd4BQ',
	  consumer_secret: 'LiEycusdNe6FhvE2EgWeMtWUJpko5NA5b83OXFcrzF4',
	  access_token_key: '81404737-Iegd5zGT90UsEF9cNVXNZDQgZC76KB0Au43K9yguR',
	  access_token_secret: 'MIKDuaIUCsACEFx0SkGjh18FJvp1gpN1I7QW1QyKfolBo'	
};

var bearer_token = credentials.consumer_key + ":" + credentials.consumer_secret;// pAg9dVAOAnw7fm5XYAd4BQ:LiEycusdNe6FhvE2EgWeMtWUJpko5NA5b83OXFcrzF4
var base64 = "cEFnOWRWQU9Bbnc3Zm01WFlBZDRCUTpMaUV5Y3VzZE5lNkZodkUyRWdXZU10V1VKcGtvNU5BNWI4M09YRmNyekY0"; // convert online: http://www.motobit.com/util/base64-decoder-encoder.asp

module.exports = credentials;