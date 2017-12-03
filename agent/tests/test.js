var redis = require('redis')
var express = require('express')
var fs      = require('fs')
var app = express()
// REDIS
var client = redis.createClient(6379, '127.0.0.1', {})
// client.auth('abcde');
///////////// WEB ROUTES


app.use(function(req, res, next) 
{
	console.log(req.method, req.url);
	next();
	
});

app.get('/test', function(req, res) {
	client.lrange('active_nodes', 0, -1, function(err, nodes) {
		res.writeHead(200, {'content-type':'text/html'});
		for (var e = 0; e< nodes.length; e++) {
			res.write(nodes[e] + "<br />");	
		}
		res.end();
	});
})

app.get('/removeItem', function(req, res) {
	client.lrem('active_nodes', 1, '192.168.0.1', function(err, reply){
		console.log("removed from list");
	});
	res.writeHead(200, {'content-type':'text/html'});
	res.write('removed items');
	res.end();
})

app.get('/addItems', function(req, res) {

	client.lpush('active_nodes', '192.168.0.1', function(err, reply){
		console.log('added to list');
	});

	client.lpush('active_nodes', '192.168.0.2', function(err, reply){
		console.log('added to list');
	});

	client.lpush('active_nodes', '192.168.0.3', function(err, reply){
		console.log('added to list');
	});

	res.writeHead(200, {'content-type':'text/html'});
	res.write('added items');
	res.end();
})


// HTTP SERVER
var server = app.listen(4000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})

exports 