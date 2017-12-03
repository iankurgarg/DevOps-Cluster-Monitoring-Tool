var exec = require('ssh-exec');
var nodemailer = require('nodemailer');
var sleep = require('system-sleep');
var redis = require('redis');
var deasync = require('deasync');

var client = redis.createClient(6379, '127.0.0.1', {});
client.auth('abcde');

function SendEmail(to_mail, sub, msg)  {
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

    // var mailOptions = {
    //   from: 'devops.csc.519@gmail.com',
    //   to: 'akshetty@ncsu.edu',
    //   subject: 'Attention - Server Down!!',
    //   text: 'Server down!'
    // };

    // var mailOptions = {
    //   from: 'devops.csc.519@gmail.com',
    //   to: 'agarg12@ncsu.edu',
    //   subject: 'Attention - Server Down!!',
    //   text: 'Server down!'
    // };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
}


function RestartForverProcess(node) {
    var command = 'forever stopall';
    var keys_path = '/etc/git/ssh_keys/' + node + '.key';

    exec(command, {
      user: 'ubuntu',
      host: node,
      key: keys_path,
      // password: 'ubuntu'
    }).pipe(process.stdout)


    command = 'cd /etc/git/checkbox.io/server-side/site && forever start server.js';

    exec(command, {
      user: 'ubuntu',
      host: node,
      key: keys_path,
      // password: 'ubuntu'
    }).pipe(process.stdout)
}


function RestartService(service_name, node){
    var service = 'sudo systemctl restart ' + service_name + '.service';
    var keys_path = '/etc/git/ssh_keys/' + node + '.key';

    exec(service, {
      user: 'ubuntu',
      host: node,
      key: keys_path,
      password: 'ubuntu'
    }).pipe(process.stdout)
}

// Given a node, removes it from the list of active nodes 
// and adds it to list of inactive nodes
function MoveNodeToActive(node) {
  client.lrem('inactive_nodes', 0, node, function(err, reply) {
    client.lpush('active_nodes', node, function(err2, reply2){
      console.log("node: ", node, " moved from inactive to active nodes");
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

  fsextra.copySync('default', '/etc/nginx/sites-available/default');

  var result = child_process.execSync('sudo systemctl reload nginx', {
        cwd: local
    }).toString('utf8');

  nginx_config_changed = 0;
}


function RecoverNode(node) {
  RestartForverProcess(node);
  MoveNodeToActive(node);
  SendEmail('agarg12@ncsu.edu', 'Update from Auto-Recovery Agent', 'Auto-Recovery has recovered node ' + node);

}

// Main function which will called after an interval which will check if active_nodes are 'healthy'
function RunForAllIPs() {
  var flag = 0;
  client.lrange('inactive_nodes', 0, -1, function(err, nodes) {
    if (nodes != null && nodes.length > 0) {
      nodes.forEach(RecoverNode(node));  
      nginx_config_changed = 1;
    }
    else {
      nginx_config_changed = 0;
    }
    flag = 1;
  });

  // Wait for callback to complete.
  while (flag != 1) {
    deasync.runLoopOnce();
  }

  if (nginx_config_changed == 1) {
    UpdateNginxConfig();
  }
}


RunForAllIPs();


