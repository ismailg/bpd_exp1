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
const ai_types      = ['Nash'];
const aiName  = ['Random Player']; // Change Player Level Name
const game_names      = ['trust', 'ultimatum'];

// Function to shuffle an array. Useful for randomly selecting ai_types for new participants.
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
// ai_types in randomized order
var ai_types_array = ai_types.slice();
shuffleArray(ai_types_array);

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
      'ai_type': '',
      'start': date.toISOString(),
      'end': '',
      'data': {
        'descriptives': {},
        'trust': [],
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
            console.log("server checked ID")

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
        //data.human_role = config.human_role;
        //
        console.log('this is the human role: %s',data.role)
        //
        var room = find_room(data);
        join_room(socket, room, data);

      }
      // if (typeof players[socket.id] !== 'undefined' && typeof rooms[socket.room_id] !== 'undefined') {
      //   // save any descriptives also in room
      //   rooms[socket.room_id].data.descriptives[socket.id] = players[socket.id].data.descriptives;
      // }

      if(typeof rooms[socket.room_id] !== 'undefined'){
        var ai_type = rooms[socket.room_id].ai_type;
        opponentName  = aiName[ ai_types.indexOf(ai_type[0]) ] || "";
      }


      socket.emit('joined room', {
        session_id: room,
        human_role: config.human_role,
        opponentName,
        // TODO: should we really provide the ai_type as a message?
        ai_type: rooms[socket.room_id].ai_type[0] || "",
        config: config
      });
    });

/* ---------------------------------------------------------------------------
            Start Game Request from Client
----------------------------------------------------------------------------*/


    socket.on('start-game-request', function (data) {
      // (human) client can send request to start game
      // TODO: check if game has been played
      try {
        console.log("start-game-request received from %s", socket.id);
        if (game_names.indexOf(data.game) !== -1) {
          rooms[socket.room_id].current_game = data.game;
          rooms[socket.room_id].current_round = 1;
          console.log("set game to %s", rooms[socket.room_id].current_game)
          // initialize score in game to 0
          var clients = io.nsps['/'].adapter.rooms[socket.room_id].sockets;
          for (var c in clients) {
            rooms[socket.room_id].score[c][rooms[socket.room_id].current_game] = 0;
            // players[socket.id].score[rooms[socket.room_id].current_game] = 0;
            players[c].score[rooms[socket.room_id].current_game] = 0;
            //added ai_type to player's data file
            // players[socket.id].ai_type = rooms[socket.room_id].ai_type;
            players[c].ai_type = rooms[socket.room_id].ai_type;

            var roundIndex  = rooms[socket.room_id].current_sub_round - 1;
            var ai_type   = rooms[socket.room_id].ai_type;
            var currentGame = rooms[socket.room_id].current_game;

            // rooms[socket.room_id].detailed_score[c][currentGame][roundIndex] =  {
            //   "ai_opponent" : ai_type[0] || "",
            //   "score" : 0
            // };
            // players[c].detailed_score[currentGame][roundIndex] =  {
            //   "ai_opponent" : ai_type[0] || "",
            //   "score" : 0
            // };

            //rooms[socket.room_id].gameScore[currentGame]['detail'][roundIndex]["ai_opponent"] = ai_type[0] || "";

          }
          io.in(socket.room_id).emit('start-game', { 'game': rooms[socket.room_id].current_game });
          socket.on('player is waiting for results', function(){
            // The below will ask agent to start round, and agent will take action
            io.in(socket.room_id).emit('start-round', { 'game': rooms[socket.room_id].current_game, 'round': rooms[socket.room_id].current_round });
          });
        }
      } catch (err) {
        console.log(err);
      }
    });

    // this event takes an action from a (human or computer) investor
    socket.on('investor took action', function (data) {

       //console.log('----------Take action DataIO----------');
       // console.log( JSON.stringify(data, null, 2));
       //console.log('----------Take action DataIOEnd----------');
      try {
        console.log('rooms[socket.room_id].current_game', rooms[socket.room_id].current_game)

        // data should be an object (JSON) format with
        // {(socket) id: , action: , rt: }
        config.debug && console.log('Investor action %s received from %s', data.action, socket.id);

        // push the action to the players array
        players[socket.id].data[rooms[socket.room_id].current_game].push({ 'round': rooms[socket.room_id].current_round, 'action': data.action, 'rt': data.rt });

        // push the action in the current actions array
        rooms[socket.room_id].current_actions.push({ id: socket.id, action: data.action, rt: data.rt, agent: data.agent });

        // Emit message investor has taken action
        io.in(socket.room_id).emit('investor has chosen', data.action);
        console.log("investor has chosen emitted---------");

      } catch (err) {
      console.log(err);
      }

     });


     socket.on('trustee received results', function(data){
       io.in(socket.room_id).emit('send investor funds', data);
       console.log("investor funds sent---------", data);
     });


     socket.on('take-action-trustee', function (data) {

       // console.log('----------Take action DataIO----------');
       // console.log( JSON.stringify(data, null, 2));
       // console.log('----------Take action DataIOEnd----------');
       try {
         console.log('rooms[socket.room_id].current_game', rooms[socket.room_id].current_game)

         // data should be an object (JSON) format with
         // {(socket) id: , action: , rt: }
         config.debug && console.log('Trustee action %s received from %s', data.action, socket.id);

         // push the action to the players array
         players[socket.id].data[rooms[socket.room_id].current_game].push({ 'round': rooms[socket.room_id].current_round, 'action': data.action, 'rt': data.rt });

         // push the action in the current actions array
         rooms[socket.room_id].current_actions.push({ id: socket.id, action: data.action, rt: data.rt});

         // check if everyone acted
         if (rooms[socket.room_id].current_actions.length == rooms[socket.room_id].players) {
           // all actions have been taken
           rooms[socket.room_id].feedback_done = 0;

           config.debug && console.log('all actions received');
         }
       } catch (err) {
       console.log(err);
       }

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
          var new_room_id = uuidv4();
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
      //check if there are any ai_types left
      if (ai_types_array.length == 0) {
        // create new set of randomized ai_types
        ai_types_array = ai_types.slice();
        shuffleArray(ai_types_array);
      }
      // pick first element as ai_type for this room
      var ai_type = ai_types_array.splice(0, 1);
      console.log(ai_type);

      return {
        id,
        actualUserID,
        gameScore : false,
        experiment_id,
        human_role: config.human_role,
        ai_role: config.ai_role,
        ai_type: ai_type,
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

          if(!this.ai_type.length){
            console.log('Error !!! ai_type not given !!!')
            return;
          }
          var ai_type = this.ai_type[0];

          // add scores for this player

          if (this.participants() == this.required_participants) {
            // fill room with AI players
            var ai_required = config.players - this.participants();

            if (ai_required > 0) {
              ai_agents[this.id] = [];
              for (var i = 1; i <= ai_required; i++) {
                var agent;
                //agent = new agents.NashInvestor(this.id);
                if (ai_type == "Nash") {
                  console.log("Creating Nash player");
                  agent = new agents.NashInvestor(this.id);
                // } else if (ai_type == "Level1") {
                //   console.log("Creating LevelOnePlayer");
                //   agent = new agents.LevelOnePlayer(this.id, config.epsilon);
                // } else if (ai_type == "Level2") {
                //   console.log("Creating LevelTwoPlayer");
                //   agent = new agents.LevelTwoPlayer(this.id, config.epsilon);
                // }
                ai_agents[this.id][i - 1] = agent;
                ai_agents[this.id][i - 1].join(this.id);

                remainingPlayers = ai_types.filter(e => e !== ai_type); // will return ['A', 'C']

                if(remainingPlayers.length){
                  ai_type = remainingPlayers[0];
                }
               }
             };
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
              trust_3: 0
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
    } // End of function create_room



  });
