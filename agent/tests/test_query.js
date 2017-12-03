var fs      = require('fs');
var template  = require('swig');
var request = require("request");
var redis = require('redis');
var deasync = require('deasync');

// var client = redis.createClient(6379, '127.0.0.1', {});
// client.auth('abcde');

var nginx_config_changed = 0; // flag to notify if nginx config needs t be updated
var error_threshold = 0.08;	// max percentage of requests which can return 500
var time_threshold = 20; // threshold request processing time in ms

// Given a node id, it returns the percentage of requests which returned 500 error

//curl -XGET "http://192.168.50.15:9200/nginx-2017.12.03/_search" -H 'Content-Type: application/json' -d' { "query": { "bool": { "must": [ { "match": { "upstream_addr": "192.168.50.13" } }, { "match": { "response": 200 } } ] }}}'


function GetErrorPercentage(ip_addr) {
	// Call Elastic Search for getting error percentage
	var error_conut = 0;
	var total_count = 0;

	var options = {
		uri: "http://192.168.50.15:9200/nginx-2017.12.03/_search",
		method: "GET",
		headers: {
			'Content-Type': 'application/json'
		},
		json: { "query": { "bool": { "must": [ { "match": { "upstream_addr": ip_addr } }, { "match": { "response": 200 } },{ "range": { "@timestamp": { "gt": "now-60m" }}} ] } }}
	};

	var flag = 0;

	request(options, function(err,res2,body){
		if (res2 && res2.statusCode != 500) {
			// result = JSON.parse(body);
			// get count
			error_conut = res2.body.hits.total;
		}
		flag = 1;
	});

	while (flag != 1) {
		deasync.runLoopOnce();
	}


	var options = {
		uri: "http://192.168.50.15:9200/nginx-2017.12.03/_search",
		method: "GET",
		headers: {
			'Content-Type': 'application/json'
		},
		json: { "query": { "bool": { "must": [ { "match": { "upstream_addr": ip_addr } } ] }}}
	};
	flag = 0;

	request(options, function(err,res2,body){
		if (res2 && res2.statusCode != 500) {
			// result = JSON.parse(body);
			total_count = res2.body.hits.total;
		}
		flag = 1;
	});

	while (flag != 1) {
		deasync.runLoopOnce();
	}

	return (error_conut)/(total_count*2);
}

function GetAverageResponseTime(node) {
	var time = 0.0;
	var options = {
		uri: "http://192.168.50.15:9200/nginx-2017.12.03/_search",
		method: "GET",
		headers: {
			'Content-Type': 'application/json'
		},
		json: { "query": { "bool": { "must": [ { "match": { "upstream_addr": node } }, { "range": { "@timestamp": { "gt": "now-60m" }}} ] }}, "aggs" : { "avg_rt" : { "avg" : { "field" : "rt" } } } }
	};
	var flag = 0;

	request(options, function(err,res2,body){
		if (res2 && res2.statusCode != 500) {
			// result = JSON.parse(body);
			// get count
			time = res2.body.aggregations.avg_rt.value;
		}
		flag = 1;
	});

	while (flag != 1) {
		deasync.runLoopOnce();
	}

	return time;
}


var a = GetAverageResponseTime('192.168.50.13')
console.log(a)