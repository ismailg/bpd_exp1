const config = {};

// things to switch between local and server
config.path = "";
config.port = "8078";
config.local = true; // set to true for local game and to false for server games
config.local_server = "http://localhost:" + config.port;
config.remote_server = "https://palsws07.psychlangsci.ucl.ac.uk";



//Export the module:
module.exports = {
    config
};
