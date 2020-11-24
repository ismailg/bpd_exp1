/*------------------------------------------------------------------------------
-                            Initial preparations                              -
------------------------------------------------------------------------------*/
//Getting the config:
const {config} = require('./config.js');
const path = require('path');
const publicPath = path.join(__dirname, '../public');
const { v4: uuidv4 } = require('uuid');


// Creating the express app and the socket.io server:
// const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const app = express(); //create express app
//const server = http.createServer(app); //create the server from the express app

var rooms = {};
var ai_agents = [];
var players = [];
var agents = require(__dirname + '/utils/agents');


// Preempting future experiments when we will vary the multilple on trust game...good = 3, bad = 1
const conditions      = ['good_env'  , 'bad_env'];
const conditionsName  = ['Abundance', 'Scarcity']; // Change Player Level Name
const game_names      = ['trust', 'ultimatum'];

// Function to shuffle an array. USeful for randomly selecting conditions for new participants.
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
// conditions in randomized order
var condition_array = conditions.slice();
shuffleArray(condition_array);

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


/*------------------------------------------------------------------------------
-                          Run on client connection                            -
------------------------------------------------------------------------------*/

io.on('connection', function(socket){

    //Log on connection:
    console.log('New connection by ' + socket.id);
    if (typeof players[socket.id] == 'undefined') {
    const date = new Date();
    players[socket.id] = {
      'id': socket.id,
      'room': '',
      'condition': '',
      'start': date.toISOString(),
      'end': '',
      'data': {
        'descriptives': {},
        'trust_1': [],
        'trust_2': [],
        'trust_3': [],
        'shootout': [],
        'strategy': {}
      },
      'score': {}
    }
  };

    //Test the prolific ID provided:
    socket.on('Test prolific ID', function(prolificId){

        //Get the prolific IDs:
        var currentProlificIDs = fs.readFileSync('./prolificIDs/prolificIDs.txt', 'utf8');
        currentProlificIDs = currentProlificIDs.split("\n"); //make into array

        //Create a boolean that signals whether this is a new prolific ID or not
        var isNewProlificId = true;

        //If that prolificId is already used (the file includes it)
        if(currentProlificIDs.includes(prolificId)){
            //set boolean to false
            isNewProlificId = false;

        }else{ //if it is not used yet (the file does not include it)
            //Append it to the fie with a line break
            fs.appendFile('./prolificIDs/prolificIDs.txt', prolificId + '\n', function (err) {
                if (err) {
                    // error message if append failed
                    console.log("Failed to append" + prolificId)
                }
            });
        }

        //Send back to client
        io.to(socket.id).emit('Result of Prolific ID test', isNewProlificId);

    });


    socket.on('join-room', function(data){

      /*------------------------------------------------------------------------------
      -                          Code for setting up and joining rooms                         -
      ------------------------------------------------------------------------------*/
      if (typeof data.room_id !== 'undefined') {
        // This is AI player as only one with access to room id
        opponentName = "";
        config.debug && console.log("Client %s requesting to join room %s", socket.id, data.room_id);
        // check if room is avaibable
        if (typeof rooms[data.room_id] !== 'undefined') {
          // room exists
          var room = data.room_id; // need this in join-room-reply
          if (rooms[data.room_id].participants() < rooms[data.room_id].players) {
            // room has places left, so socket can join room
            join_room(socket, data.room_id, data);
          }
        }
      } else {
        // assume this is a human
        console.log('Client %s with prolific id %s joined room %s', socket.id, data.prolific_id, room);
        //data.participants = config.players; // I don't think this is needed anymore
        data.actualUserID = socket.id;
        var room = find_room(data);
        join_room(socket, room, data);
      }
      // if (typeof players[socket.id] !== 'undefined' && typeof rooms[socket.room_id] !== 'undefined') {
      //   // save any descriptives also in room
      //   rooms[socket.room_id].data.descriptives[socket.id] = players[socket.id].data.descriptives;
      // }

      if(typeof rooms[socket.room_id] !== 'undefined'){
        var condition = rooms[socket.room_id].condition;
        opponentName  = conditionsName[ conditions.indexOf(condition[0]) ] || "";
      }

      socket.emit('joined room', {
        session_id: room,
        opponentName,
        // TODO: should we really provide the condition as a message?
        condition: rooms[socket.room_id].condition[0] || "",
        config: config
      });
    });

    /*------------------------------------------------------------------------------
    -                          Useful functions for creating or finding rooms      -
    ------------------------------------------------------------------------------*/

    function find_room(data) {

      var room_to_join;
      var room_keys = Object.keys(rooms);
      // if currently there are no rooms, create new one
      if (room_keys.length == 0) {
        var new_room_id = uuidv4();
        rooms[new_room_id] = create_room(new_room_id, data.experiment, data.actualUserID);
        room_to_join = new_room_id;
      } else {
        // first join rooms that are waiting for players
        for (var i = 0; i < room_keys.length; i++) {
          if (
            // rooms[room_keys[i]].started == false &&
            rooms[room_keys[i]].started == false &&
            rooms[room_keys[i]].participants() > 0 &&
            rooms[room_keys[i]].participants() < rooms[room_keys[i]].required_participants &&
            rooms[room_keys[i]].experiment_id == data.experiment
          ) {
            room_to_join = rooms[room_keys[i]].id;
            break;
          }
        }
        // then make new empty room
        if (typeof room_to_join == 'undefined') {
          var new_room_id = uuid();
          rooms[new_room_id] = create_room(new_room_id, data.experiment, data.actualUserID);
          room_to_join = new_room_id;
        }
      }
      return room_to_join;
    }



    function join_room(socket, room_to_join, data) {
    rooms[room_to_join].join(socket);
    //var tmp = {'id': socket.id, 'time': Date(), 'prolific_id': data.prolific_id}
    config.debug && console.log("Client %s joined room %s", socket.id, room_to_join);
    // store room in players
    players[socket.id].room = room_to_join;
    }



    function create_room(id, experiment_id, actualUserID) {
      // check if there are any conditions left
      if (condition_array.length == 0) {
        // create new set of randomized conditions
        condition_array = conditions.slice();
        shuffleArray(condition_array);
      }
      // pick first element as condition for this room
      var condition = condition_array.splice(0, 1);
      console.log(condition);

      return {
        id,
        actualUserID,
        gameScore : false,
        experiment_id,
        condition,
        required_participants: config.humans,
        players: config.players,
        started: false,
        current_game: "",
        current_round: 1,
        current_sub_round: 1,
        current_actions: [],
        score: {},
        detailed_score: {},
        data: {
          descriptives: {},
          trust_1: [],
          trust_2: [],
          trust_3: [],
          shootout: [],
          strategy: {}
        },
        participants: function () {
          try {
            //console.log(io.nsps['/'])
            return Object.keys(io.nsps['/'].adapter.rooms[this.id].sockets).length;
          } catch (e) {
            //console.log(e);
            return 0;
          } finally {

          }
        },
        join: function (socket) {
          socket.join(this.id);
          socket.room_id = this.id;

          if(!this.condition.length){
            console.log('Error !!! Condition not given !!!')
            return;
          }
          var condition = this.condition[0];

          // add scores for this player

          if (this.participants() == this.required_participants) {
            // fill room with AI players
            var ai_required = config.players - this.participants();
            if (ai_required > 0) {
              ai_agents[this.id] = [];


              for (var i = 1; i <= ai_required; i++) {
                var agent;
                agent = new agents.NashPlayer(this.id);
                // if (condition == "Nash") {
                //   console.log("Creating Nash player");
                //   agent = new agents.NashPlayer(this.id);
                // } else if (condition == "Level1") {
                //   console.log("Creating LevelOnePlayer");
                //   agent = new agents.LevelOnePlayer(this.id, config.epsilon);
                // } else if (condition == "Level2") {
                //   console.log("Creating LevelTwoPlayer");
                //   agent = new agents.LevelTwoPlayer(this.id, config.epsilon);
                // }
                ai_agents[this.id][i - 1] = agent;
                ai_agents[this.id][i - 1].join(this.id);

                remainingPlayers = conditions.filter(e => e !== condition); // will return ['A', 'C']

                if(remainingPlayers.length){
                  condition = remainingPlayers[0];
                }

              }

            }
          }
          // socket.player_id = 1; // always the left player
          console.log(this.participants() + ' of ' + this.players + ' ready in room ' + this.id);
          if (this.participants() == this.players) {
            console.log('Starting room ' + this.id);
            this.start();
          }
        },
        start: function () {
          this.started = true;

          var clients = io.nsps['/'].adapter.rooms[this.id].sockets;
          // var idx = 0;
          for (var c in clients) {
            this.score[c] = {
              trust_1: 0,
              trust_2: 0,
              trust_3: 0,
              shootout: 0
            };

            // if(typeof(this.detailed_score[c]) == 'undefined'){
            //   this.detailed_score[c] = getInitalRoundScore();
            // }
            //
            // if(this.gameScore === false){
            //   this.gameScore         = getDetailedScore();
            // }

            io.sockets.connected[c].emit('start-room', { player_id: io.sockets.connected[c].player_id });
          }
        }
      };
    } // Enf of function create_room




  });
