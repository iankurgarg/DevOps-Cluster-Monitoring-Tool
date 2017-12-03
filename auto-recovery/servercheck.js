var exec = require('ssh-exec');
var nodemailer = require('nodemailer');
var sleep = require('system-sleep');


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


function RestartForverProcess(proc, node, key='node0.key') {
    var command = 'forever stopall';
    var keys_path = '/Users/debosmitadas/Documents/Devops/HW1' + '/' + key

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


function RestartService(service_name, node, key){
    var service = 'sudo systemctl restart ' + service_name + '.service';
    var keys_path = '/Users/debosmitadas/Documents/Devops/HW1' + '/' + key

    exec(service, {
      user: 'ubuntu',
      host: node,
      key: keys_path,
      password: 'ubuntu'
    }).pipe(process.stdout)
}




//checking purpose - not necessary
// exec('ls -lh', {
//   user: 'ubuntu',
//   host: '192.168.33.10',
//   key: '/Users/debosmitadas/Documents/Devops/HW1/node0.key',
//   password: 'ubuntu'
// }).pipe(process.stdout)


