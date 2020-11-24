const config = {};

// things to switch between local and server
config.path = "";
config.port = "8078";
config.local = true; // set to true for local game and to false for server games
config.local_server = "http://localhost:" + config.port;
config.remote_server = "https://palsws07.psychlangsci.ucl.ac.uk";

config.debug = true;
config.players = 2;
config.humans = 1;


config.conditions = [
  "good_env",
  "bad_env"
];

config.numrounds1 = 10;
config.numrounds2 = 10;
config.numrounds3 = 10;


config.good_mult = 3;
config.bad_mult = 1;

config.showUpFee = '1.00';


//Export the module:
module.exports = {
    config

};
