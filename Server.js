var httpProxy = require("http-proxy");
var http = require("http");
var url = require("url");
var net = require('net');
var fs   = require('fs');

//setup for blacklisting
var blocked = [];
fs.watchFile('./blacklist.txt', function(c,p) { update_blacklist(); });
//blacklisted urls will be stored in a file
function update_blacklist() {
  //blocked websites stored locally in blacklist.txt
  blocked = fs.readFileSync('./blacklist.txt').toString().split('\n')
              .filter(function(rx) { return rx.length })
              .map(function(rx) { return RegExp(rx) });
}

//create server for http requests
var server = http.createServer(function (req, res) {
  //check blacklist file to see if blocked
  for(i in blocked){
    if (blocked[i].test(req.url)) {
      console.log("Denied: " + req.method + " " + req.url);
      res.end();
      return;
    }
  }
    //parsing url
    var urlObj = url.parse(req.url);
    var target = urlObj.protocol + "//" + urlObj.host;
    console.log("Request:", target);
    //handling in case of an error
    var proxy = httpProxy.createProxyServer({});
    proxy.on("error", function (err, req, res) {
      console.log("Incorrect URL Syntax");
      res.end();
    });
    proxy.web(req, res, {target: target});
}).listen(8080);  //client port

console.log('jujujj');

update_blacklist();

//for https
server.addListener('connect', function (req, socket, bodyhead) {
  var urlObjS = url.parse(req.url);
  var targetS = urlObjS.protocol + "//" + urlObjS.host;
  //split string for output
  var hostDomain = req.url.split(":")[0];//takes first part
  
  console.log("Requesting:", hostDomain);

  var proxySocket = new net.Socket();
  proxySocket.connect(443, hostDomain, function () {
      proxySocket.write(bodyhead);
      socket.write("HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n");
    }
  );

  proxySocket.on('data', function (chunk) {
    socket.write(chunk);
  });

  proxySocket.on('end', function () {
    socket.end();
  });

  proxySocket.on('error', function () {
    socket.write("HTTP/" + req.httpVersion + " 500 No Connection");
    socket.end();
  });

  socket.on('data', function (chunk) {
    proxySocket.write(chunk);
  });

  socket.on('end', function () {
    proxySocket.end();
  });

  socket.on('error', function () {
    proxySocket.end();
  });

});