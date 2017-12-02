var fs      = require('fs');
var template  = require('swig');
var request = require("request");
var redis = require('redis');
var deasync = require('deasync');

var client = redis.createClient(6379, '127.0.0.1', {});
client.auth('abcde');

var nginx_config_changed = 0; // flag to notify if nginx config needs t be updated
var error_threshold = 0.08;	// max percentage of requests which can return 500
var time_threshold = 20; // threshold request processing time in ms

// Given a node id, it returns the percentage of requests which returned 500 error
function GetErrorPercentage(ip_addr) {
	// Call Elastic Search for getting error percentage
	var error_conut = 0;
	var total_count = 0;

	var options = {
		uri: "elastic_search_api_call_url"
	};
	var flag = 0;

	request(options, function(err,res2,body){
		if (res2 && res2.statusCode != 500) {
			result = JSON.parse(body);
			// get count
			error_conut = result.hits.total;
		}
		flag = 1;
	});

	while (flag != 1) {
		deasync.runLoopOnce();
	}


	var options = {
		uri: "elastic_search_api_call_url"
	};
	flag = 0;

	request(options, function(err,res2,body){
		if (res2 && res2.statusCode != 500) {
			result = JSON.parse(body);
			total_count = result.hits.total;
		}
		flag = 1;
	});

	while (flag != 1) {
		deasync.runLoopOnce();
	}

	return float(error_conut)/float(total_count);
}

// Given a node, returns the average request processing time
function GetAverageResponseTime(node) {
	var time = 0.0;
	var options = {
		uri: "elastic_search_api_call_url"
	};
	var flag = 0;

	request(options, function(err,res2,body){
		if (res2 && res2.statusCode != 500) {
			result = JSON.parse(body);
			// get count
			time = 0.0;
		}
		flag = 1;
	});

	while (flag != 1) {
		deasync.runLoopOnce();
	}

	return time;
}

// Given a node, removes it from the list of active nodes 
// and adds it to list of inactive nodes
function MoveNodeToInActive(node) {
	client.lrem('active_nodes', 0, node, function(err, reply) {
		client.lpush('inactive_nodes', node, function(err2, reply2){
			console.log("node: ", node, " moved from active to inactive nodes");
		});
	});
}


// When called, re-creates a nginx config file and restarts the nginx service
function UpdateNginxConfig() {
	// Update Nginx Config here
	var active_nodes = [];
	var flag = 0;
	client.lrange('active_nodes', 0, -1, function(err, nodes) {
		active_nodes = nodes;
		flag = 1;
	});

	// Wait for callback to complete.
	while (flag != 1) {
		deasync.runLoopOnce();
	}

	// Now we have the list of active nodes. Update the configuration now.
	var tmpl = template.compileFile(__dirname + '/nginx.conf.j2');
	renderedTMPL = tmpl.render({
		nodes: active_nodes
	});

	fs.writeFileSync('nginx.conf.processed', renderedTMPL);

	// New configuratoin file is ready
	// Restart nginx service to use this conf file

	nginx_config_changed = 0;
}


// Main function which will called after an interval which will check if active_nodes are 'healthy'
function RunForAllIPs() {
	var flag = 0;
	client.lrange('active_nodes', 0, -1, function(err, nodes) {
		nodes.forEach(function(node) {
			var errorPercent = GetErrorPercentage(node);

			if (errorPercent >= error_threshold) {
				MoveNodeToInActive(node);
				nginx_config_changed = 1;
			}
			else {
				var avgtime = GetAverageResponseTime(node);
				if (avgtime >= time_threshold) {
					MoveNodeToInActive(node);
					nginx_config_changed = 1;
				}
			}
			
		});
		flag = 1;
	});

	// Wait for callback to complete.
	while (flag != 1) {
		deasync.runLoopOnce();
	}

	flag = 0;

	if (nginx_config_changed == 1) {
		UpdateNginxConfig();
	}
}

