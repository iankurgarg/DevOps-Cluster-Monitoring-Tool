var exec = require('ssh-exec');
var nodemailer = require('nodemailer');
var sleep = require('system-sleep');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'devops.csc.519@gmail.com',
    pass: 'devopscsc'
  }
});

var mailOptions = {
  from: 'devops.csc.519@gmail.com',
  to: 'ddas5@ncsu.edu',
  cc: 'ddas5@ncsu.edu',
  bcc: 'ddas5@ncsu.edu',
  bcc: 'ddas5@ncsu.edu',
  subject: 'Attention - Server Down!!',
  text: 'Server down!'
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

var service = 'sudo systemctl restart ' + process.argv[2] + '.service';

exec(service, {
  user: 'ubuntu',
  host: '192.168.33.10',
  key: '/Users/debosmitadas/Documents/Devops/HW1/node0.key',
  password: 'ubuntu'
}).pipe(process.stdout)

//checking purpose - not necessary
exec('ls -lh', {
  user: 'ubuntu',
  host: '192.168.33.10',
  key: '/Users/debosmitadas/Documents/Devops/HW1/node0.key',
  password: 'ubuntu'
}).pipe(process.stdout)

sleep(60000);
var mailSuccess = {
  from: 'devops.csc.519@gmail.com',
  to: 'ddas5@ncsu.edu',
  cc: 'akshetty@ncsu.edu',
  cc: 'agarg12@ncsu.edu',
  cc: 'ajatari@ncsu.edu',
  subject: 'Yay - Server is up again!!',
  text: 'ha ha ha!'
};
var mailSuccess = {
  from: 'devops.csc.519@gmail.com',
  to: 'akshetty@ncsu.edu',
  subject: 'Yay - Server is up again!!',
  text: 'ha ha ha!'
};
var mailSuccess = {
  from: 'devops.csc.519@gmail.com',
  to: 'agarg12@ncsu.edu',
  subject: 'Yay - Server is up again!!',
  text: 'ha ha ha!'
};

transporter.sendMail(mailSuccess, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
