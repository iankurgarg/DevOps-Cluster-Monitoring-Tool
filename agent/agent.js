var fs      = require('fs');
var fsextra      = require('fs-extra');
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
// Sample cURL request
// curl -XGET "http://192.168.50.15:9200/nginx-2017.12.03/_search" -H 'Content-Type: application/json' -d' { "query": { "bool": { "must": [ { "match": { "upstream_addr": "192.168.50.13" } }, { "match": { "response": 200 } } ] }}}'
function GetErrorPercentage(ip_addr) {
	// Call Elastic Search for getting error percentage
	var error_conut = 0;
	var total_count = 0;

	var options = {
		uri: "http://localhost:9200/nginx-2017.12.03/_search",
		method: "GET",
		headers: {
			'Content-Type': 'application/json'
		},
		json: { "query": { "bool": { "must": [ { "match": { "upstream_addr": ip_addr } }, { "match": { "response": 500 } },{ "range": { "@timestamp": { "gt": "now-60m" }}} ] } }}
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
		uri: "http://localhost:9200/nginx-2017.12.03/_search",
		method: "GET",
		headers: {
			'Content-Type': 'application/json'
		},
		json: { "query": { "bool": { "must": [ { "match": { "upstream_addr": ip_addr } }, { "range": { "@timestamp": { "gt": "now-60m" }}} ] } }}
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

	return (error_conut)/(total_count);
}

// Given a node, returns the average request processing time
function GetAverageResponseTime(node) {
	var time = 0.0;
	var options = {
		uri: "http://localhost:9200/nginx-2017.12.03/_search",
		method: "GET",
		headers: {
			'Content-Type': 'application/json'
		},
		json: { "query": { "bool": { "must": [ { "match": { "upstream_addr": node } }, { "range": { "@timestamp": { "gt": "now-60m" }}} ] }}, "aggs" : { "avg_rt" : { "avg" : { "field" : "rt" } } } }
	};
	var flag = 0;

	request(options, function(err,res2,body){
		if (res2 && res2.statusCode != 500) {
			time = res2.body.aggregations.avg_rt.value;
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

	fs.writeFileSync('default', renderedTMPL);

	// New configuratoin file is ready
	// Restart nginx service to use this conf file

	fsextra.copySync('default', '/etc/default');

	nginx_config_changed = 0;
}

// Given a message, to address, and subejct sends the email. 
// It is used to send an update to admin about any problems in any nodes.
function SendEmail(msg, to_mail, sub)  {
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'devops.csc.519@gmail.com',
        pass: 'devopscsc'
      }
    }); 
    
    var mailOptions = {
      from: 'devops.csc.519@gmail.com',
      to: to_mail,
      cc: to_mail,
      bcc: to_mail,
      bcc: to_mail,
      subject: sub,
      text: msg
    }; 

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
}


// Main function which will called after an interval which will check if active_nodes are 'healthy'
function RunForAllIPs() {
	var flag = 0;
	client.lrange('active_nodes', 0, -1, function(err, nodes) {
		nodes.forEach(function(node) {
			var errorPercent = GetErrorPercentage(node);

			if (errorPercent >= error_threshold) {
				MoveNodeToInActive(node);
				SendEmail("Node: " + node + " is under performing and hence is being removed from load balancer for now.", 
									"agarg12@ncsu.edu", "Update from Monitoring Agent");
				nginx_config_changed = 1;
			}
			else {
				var avgtime = GetAverageResponseTime(node);
				if (avgtime >= time_threshold) {
					MoveNodeToInActive(node);
					SendEmail("Node: " + node + " is under performing and hence is being removed from load balancer for now.", 
									"agarg12@ncsu.edu", "Update from Monitoring Agent");
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

