var template  = require('swig');
var fs      = require('fs');


var tmpl = template.compileFile(__dirname + '/nginx.conf.j2');
renderedTMPL = tmpl.render({
    nodes: ['192.168.0.1', '192.168.0.2', '192.168.0.3']
});

console.log(renderedTMPL);

fs.writeFileSync('nginx.conf.processed', renderedTMPL);