var nodemailer = require('nodemailer');

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

node = '192.168.50.13'
SendEmail("Node: " + node + " is under performing and hence is being removed from load balancer for now.", 
                  "agarg12@ncsu.edu", "Update from Monitoring Agent");