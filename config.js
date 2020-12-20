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

config.human_role = "trustee";
config.ai_role = "investor";

config.role_conditions = [
  "investor",
  "trustee"
];

// Number of round, assumign three games played.
config.numrounds1 = 10;
config.numrounds2 = 10;
config.numrounds3 = 10;

// Endowment given to investor at the start of each round.
config.endowment = 20;

// How much does the amount sent by investor get multiplied by?
config.mult = 3;


config.showUpFee = '1.00';


//Export the module:
module.exports = {
    config

};
