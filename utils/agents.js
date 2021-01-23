// from https://stackoverflow.com/questions/36073372/adding-a-chatbot-in-socket-io-basic-chat-application
//
var {config} = require('../config');

const sio = require('socket.io-client');
//var socketAddress = config.getServerAddress();
var socketAddress = config.local_server

function Agent(room_id) {
  config.debug &&
    console.log("Agent constructor called with room_id=" + room_id);
  this.socket = undefined;
  this.room_id = room_id;
  // this.role =
  // this.minimumRT = config.minimum_decision_time;
  // this.maximumRT = config.maximum_decision_time;
  (this.states = []), (this.actions = []), (this.rewards = []);
}

Agent.prototype.join = function (room_id) {
  config.debug && console.log("Agent.join: called with room_id=" + room_id);
  config.debug &&
    console.log(`Connecting to ${config.local_server} for ${room_id}`);
  /**
   * There is a known issue while establishing the connection with socket.io-client
   * See https://github.com/socketio/socket.io-client/issues/1097
   */
  this.socket = sio.connect(config.local_server, {
    path: config.path + "/socket.io",
    reconnection: true,
    agent: false,
    rejectUnauthorized: false,
  });

    this.socket.room_id = room_id;
    this.room_id = room_id;
    var socket = this.socket;

    socket.on("connect_error", function (e) {
      console.log("socket connect_error");
      console.log(e);
    });
    socket.on('connect', this.connect_listener.bind(this));
    socket.on('start-game', this.start_game_listener.bind(this));
    socket.on('start-round', this.start_round_listener.bind(this));
    // socket.on('win', this.win_listener.bind(this));
    // socket.on('loss', this.loss_listener.bind(this));
    // socket.on('tie', this.tie_listener.bind(this));
    socket.on('player-left', this.player_left_listener.bind(this));
};

Agent.prototype.connect_listener = function () {
  config.debug && console.log("Agent.connect_listener: called");
  var socket = this.socket;
  config.debug &&
    console.log(
      "Agent with socket id %s will attempt to join room %s",
      socket.id,
      this.room_id
    );
  socket.emit("join-room", { room_id: this.room_id });
};

Agent.prototype.leave = function () {
  var socket = this.socket;
  socket.disconnect();
};

Agent.prototype.start_game_listener = function (data) {
  this.states = [],
    this.actions = [],
    this.rewards = []
  config.debug && console.log('start-game received')
}

Agent.prototype.start_round_listener = function (data) {
  config.debug && console.log('start-round received in game %s by %s', data.game, this.socket.id);
  var state = [];

  if (this.states.length > 0) {
    state = this.states[this.states.length - 1];
  }

  // var actions = config.game_actions[data.game];
  // this.take_action(state, actions);
  this.take_action(state);
}

// Agent.prototype.win_listener = function (data) {
//   var state = {
//     my_action: data[0].action,
//     opponent_action: data[1].action
//   }
//   var reward = 1;
//   this.update(state, reward);
//   this.socket.emit('feedback-done');
// };
//
// Agent.prototype.loss_listener = function (data) {
//   var state = {
//     my_action: data[0].action,
//     opponent_action: data[1].action
//   }
//   var reward = -1;
//   this.update(state, reward);
//   this.socket.emit('feedback-done');
// };
//
// Agent.prototype.tie_listener = function (data) {
//   var state = {
//     my_action: data[0].action,
//     opponent_action: data[1].action
//   }
//   var reward = 0;
//   this.update(state, reward);
//   this.socket.emit('feedback-done');
// };

Agent.prototype.new_message_listener = function (data) {
  var socket = this.socket;
  if (data.message == 'Hello, HAL. Do you read me, HAL?')
    socket.emit('message', 'Affirmative, ' + data.username + '. I read you.');
};

Agent.prototype.player_left_listener = function (data) {
  if (data.current_players == 1) {
    // agent is all alone :-(
    // better leave
    this.leave();
  }
};

Agent.prototype.determine_RT = function () {
  return this.minimumRT + Math.random() * (this.maximumRT - this.minimumRT);
};

// Agent.prototype.take_action = function (state, actions) {
//   var socket = this.socket;
//   config.debug && console.log('%s is taking action from actions %s', socket.id, actions);
//
//   var act = this.determine_action(state, actions);
//
//   config.debug && console.log('%s took action %s', socket.id, act, state);
//   var random_RT = this.determine_RT()
//   this.timeout = setTimeout(function () {
//     socket.emit('take-action', { action: act, rt: random_RT, agent: true });
//   }, random_RT);
//   this.actions.push(act);
// };

Agent.prototype.take_action = function (state) {
  var socket = this.socket;
  config.debug && console.log('%s is taking action', socket.id);

  var act = this.determine_action(state);

  config.debug && console.log('agent %s took action %s', socket.id, act);
  var random_RT = this.determine_RT()
  this.timeout = setTimeout(function () {
    //change below to allow for agent to be also trustee in future
    socket.emit('investor took action', { action: act, rt: random_RT, agent: true });
  }, random_RT);
  this.actions.push(act);
};


Agent.prototype.update = function (state, reward) {
  this.states.push(state);
  this.rewards.push(reward);
}

Agent.prototype.constructor = Agent;


function NashInvestor(room_id) {
  Agent.call(this, room_id);
}

NashInvestor.prototype = Object.create(new Agent());

// Action is how much investor sends to trustee, from 0 to endowment.
NashInvestor.prototype.determine_action = function (state) {
  max = config.endowment
  var item = Math.floor(Math.random() * max);
  return item;
}

NashInvestor.prototype.constructor = NashInvestor;

// function LevelOnePlayer(room_id, epsilon) {
//   Agent.call(this, room_id);
//   this.epsilon = epsilon;
// }
//
// LevelOnePlayer.prototype = Object.create(new Agent());
//
// LevelOnePlayer.prototype.constructor = LevelOnePlayer;
//
// LevelOnePlayer.prototype.determine_action = function (state, actions) {
//   config.debug && console.log(this.states);
//   if (Math.random() <= this.epsilon || this.states.length == 0) {
//     return actions[Math.floor(Math.random() * actions.length)];
//   } else {
//     var state = this.states[this.states.length - 1];
//     return best_response(state.opponent_action);
//   }
// }
//
// function LevelTwoPlayer(room_id, epsilon) {
//   Agent.call(this, room_id);
//   this.epsilon = epsilon;
// }
//
// LevelTwoPlayer.prototype = Object.create(new Agent());
//
// LevelTwoPlayer.prototype.constructor = LevelTwoPlayer;
//
// LevelTwoPlayer.prototype.determine_action = function (state, actions) {
//   config.debug && console.log(this.states);
//   if (Math.random() <= this.epsilon || this.states.length == 0) {
//     var item = actions[Math.floor(Math.random() * actions.length)];
//     return item;
//   } else {
//     var state = this.states[this.states.length - 1];
//     // check if game is shootout, level 2 player action is coded differently
//     if (actions[0] === 'left') {
//       remainingActions = actions.filter(e => e !== state.my_action);
//       // best response is to choose amongst the remaining actions randomly
//       var item2 = remainingActions[Math.floor(Math.random() * remainingActions.length)];
//       return item2
//     }
//     else {
//       return best_response(best_response(state.my_action));
//     }
//   }
// }
//
// const random = (actions) => actions[Math.floor(Math.random() * actions.length)];



exports.Agent = Agent;
exports.NashInvestor = NashInvestor;
// exports.LevelOnePlayer = LevelOnePlayer;
// exports.LevelTwoPlayer = LevelTwoPlayer;
