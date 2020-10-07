
/*------------------------------------------------------------------------------
-                            Web functionalities  (from Sam Dupret code)                            -
------------------------------------------------------------------------------*/

//Checking userAgent information:
var userAgent = navigator.userAgent;
//If user is on mobile, or is using neither chrome or firefox...
if (
    userAgent.indexOf("Mobi") !== -1 ||
    userAgent.indexOf("Firefox") == -1 &&
    userAgent.indexOf("Chrome") == -1
){
    //Redirect to a page that asks them to come back with a different setup.
    window.location = "redirectInternet.html";
}

//Preventing right click:
document.addEventListener("contextmenu", function(e){
  e.preventDefault();
}, false);

/*------------------------------------------------------------------------------
-                                 Startup                                     -
------------------------------------------------------------------------------*/

//Start collecting data:
var fullUserData = {};

//Add screen information to the data
//Function to get screen information
function browserInfo() {
  return info = {
    'browser': navigator.userAgent,
    'screen': {
      'availWidth': window.screen.availWidth,
      'availHeight': window.screen.availHeight,
      'width': window.screen.width,
      'height': window.screen.height
    }
  };
}
//Add it to the data
fullUserData.browserAndScreenInfo = browserInfo();


//Connect to the app:
// const socket = io();

const socket = io('' + _SERVER_ADDRESS + '', {path: _PATH + '/socket.io'});


//Ask for Prolific ID:
document.getElementById("prolificForm").addEventListener("submit", function(e){
    //Prevent form from firing:
    e.preventDefault();

    //Getting the id entered:
    var prolificId = e.target.elements.prolificID.value;

    //Check Prolific ID in data:
    socket.emit('Test prolific ID', prolificId); //ask server to test
    //receive answer from server
    socket.on('Result of Prolific ID test', function(isNewProlificId){
        //If this is a new id:
        if(isNewProlificId){
            //Add the system that shows a warning before leaving the page. Only added here because otherwise I cannot redirect because of a wrong prolific id without giving participants the upportunity to stay on the page.
            // Warning before leaving the page (back button, or outgoing link):
            window.onbeforeunload = function() {
                let warningMsg = "If you leave now, the experiment will end and you will not receive your payment. Are you sure you want to leave this page?";
                //Gecko + IE
                window.event.returnValue = warningMsg;
                //Gecko + Webkit, Safari, Chrome etc.
                return warningMsg;
            };

            //Set the placeholder for when participants are waiting to the page:
            document.getElementById("jspsych_target").innerHTML = "<h3>Please wait for another participant to join the room. This should not take long.</h3><p>A bell sound will play when another player has joined the room and the experiment is ready to begin.</p><br><br><p>Please contact the researcher Samuel Dupret (samuel.dupret.19@ucl.ac.uk) if you encountered a problem.</p>";

            //Add the id to the data:
            fullUserData.prolificId = prolificId;

            //Inform the server of a valid id:
            socket.emit('Provided valid prolific ID', prolificId);
        }else{ //if this is an already existant id
            //Redirect
            window.location = "redirectProlificID.html";
        }
    });
});

//Start creating the experiment in jsPsych when asked by the server:
socket.on('startExperiment', function(experimentSettings){
    //Play bell sound because the other participant joined
    function playSound(soundObj) {
        var sound = document.getElementById(soundObj);
        sound.play();
    }
    playSound("bellSound");

    //console.log(experimentSettings);
    fullUserData.settings = experimentSettings;
    createInstructions(experimentSettings);
});


/*------------------------------------------------------------------------------
-                         Creating the instructions                            -
------------------------------------------------------------------------------*/
function createInstructions(experimentSettings){

    //Showing the instructions button:
    $('#toggleInstructionsButton').show();

    //Writing the instructions:
    var instructionHTML = `
    <div id="instructions-wrap">
        <h3 id="instructions-header">Instructions</h3>
        <p>Welcome to this study and thank you for participation. You have been paired with another anonymous participant. You will be given a choice to make in order to win some money. The amount of money earned depends on the choice made by you and the choice made by the other participant. On top of the money earned according to the choices, you will each receive £${experimentSettings.config.showUpFee} for answering questions about yourself and your experience making the choices. Note that payment is conditional on you completing the study.</p>
