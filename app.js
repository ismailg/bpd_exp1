/*------------------------------------------------------------------------------
-                            Initial preparations                              -
------------------------------------------------------------------------------*/
//Getting the config:
const {config} = require('./config.js');

// Creating the express app and the socket.io server:
// const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const app = express(); //create express app
//const server = http.createServer(app); //create the server from the express app

var server = app.listen(process.env.PORT || config.port, function(){
  var port = server.address().port;
  var address = ""
  if(config.local) {
    address += config.local_server + config.path + '/';
  } else {
    address += config.remote_server + config.path + '/';
  }
  console.log("Server running at port %s", port, Date());
  console.log("Server should be available at %s", address);
});

//const io = socketio(server, {path: config.path + '/socket.io'}); //create the socket on the server side
var io = require('socket.io')(server, {path: config.path + '/socket.io'});

//For creating and reading files:
const fs = require('fs');

//Setting the file paths:
//where jsPsych is
app.use(config.path + '/jsPsych', express.static(__dirname + "/jsPsych"));
app.use(config.path,express.static(__dirname + '/public'));

// construct global.js file with settings from config.js
app.get(config.path + '/js/global.js', function(req, res){
  res.setHeader('Content-type', 'text/javascript');
  var global_string = '';
  if(config.local) {
    global_string += 'var _SERVER_ADDRESS = "' + config.local_server + '"; ';
  } else {
    global_string += 'var _SERVER_ADDRESS = "' + config.remote_server + '"; ';
  }
  global_string += 'var _PATH = "' + config.path + '"; ';
  res.send(global_string);
})


/*------------------------------------------------------------------------------
-                                Config and Users                              -
------------------------------------------------------------------------------*/
