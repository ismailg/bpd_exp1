/*----------------------------------------------------------------------------*/
/*
This is a custom jsPsych plugin that asks for participants' transucent choices (only after each player has made their choice).
by Samuel Dupret
*/
/*----------------------------------------------------------------------------*/
/**BASED ON:
 * jspsych-html-button-response
 * Josh de Leeuw
 *
 * plugin for displaying a stimulus and getting a keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["askForTranslucentChoice"] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'askForTranslucentChoice',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The HTML string to be displayed'
      },
      choices: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Choices',
        default: undefined,
        array: true,
        description: 'The labels for the buttons.'
      },
/* -----------------------------Modification--------------------------------- */
      button_html: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button HTML',
        //Added "choice-btn" class to separate it out from other buttons
        default: '<button class="jspsych-btn choice-btn">%choice%</button>',
        array: true,
        description: 'The html of the button. Can create own style.'
      },
/* -------------------------------------------------------------------------- */
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed under the button.'
      },
      stimulus_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Stimulus duration',
        default: null,
        description: 'How long to hide the stimulus.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'How long to show the trial.'
      },
      margin_vertical: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Margin vertical',
        default: '0px',
        description: 'The vertical margin of the button.'
      },
      margin_horizontal: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Margin horizontal',
        default: '8px',
        description: 'The horizontal margin of the button.'
      },
      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, then trial will end when user responds.'
      },
    }
  }

  plugin.trial = function(display_element, trial) {

/* -----------------------------Modification--------------------------------- */

    // For now, set the display stimulus with this wait prompt
    var html = '<div id="jspsych-html-button-response-stimulus"><p>Please wait for the participant to make their initial choice.</p><p>This should not take more than a few minutes.</p><p>Please do not refresh or leave the experiment or we will not be able to pay you.</p><p>A bell sound will play when the experiment is ready to continue.</p></div>';

    //display buttons
    var buttons = [];
    if (Array.isArray(trial.button_html)) {
      if (trial.button_html.length == trial.choices.length) {
        buttons = trial.button_html;
      } else {
        console.error('Error in html-button-response plugin. The length of the button_html array does not equal the length of the choices array');
      }
    } else {
      for (var i = 0; i < trial.choices.length; i++) {
        buttons.push(trial.button_html);
      }
    }
    html += '<div id="jspsych-html-button-response-btngroup" style="display: inline-block;">'; //Added a " add the end of block;, otherwise it made my first button bug
    for (var i = 0; i < trial.choices.length; i++) {
      var str = buttons[i].replace(/%choice%/g, trial.choices[i]);
      html += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-html-button-response-button-' + i +'" data-choice="'+i+'">'+str+'</div>';
    }
    html += '</div>';

    //Added a hidden "Continue button"
    html += '<div id="continueButton"><button class="jspsych-btn choice-btn">Continue</button></div>'

/* -------------------------------------------------------------------------- */

    //show prompt if there is one
    if (trial.prompt !== null) {
      html += trial.prompt;
    }

    //Send html to the display element
    display_element.innerHTML = html;

/* -----------------------------Modification--------------------------------- */
    //Tell the server that this user is waiting
    socket.emit('player is waiting for detection');

    //Start a timeout that will tell the server that this user has waited for too long
    var longWaitTimeout = setTimeout(function(){
        socket.emit('waited too long', 'choice');
    }, 180000); //Need to hardcode the time (currently, 3min)

    //Hide the A and B buttons
    display_element.querySelector('#jspsych-html-button-response-btngroup').style.display = "none";

    //Hide the Continue button
    display_element.querySelector('#continueButton').style.display = "none";

    socket.on('ask for translucent choice', function(detectedChoice){
        //Stop the timeout
        clearTimeout(longWaitTimeout);

        //Play bell sound because the other participant finished choosing
        function playSound(soundObj) {
            var sound = document.getElementById(soundObj);
            sound.play();
        }
        playSound("bellSound");

        //Prepare the stimulus to show
        var stimulusHTML = "";
        if(detectedChoice !== null){ //If the choice was detected
            stimulusHTML += `
            <div id="instructions-wrap">
            <p><strong>The random draw from the computer has determined that the other participant’s choice will be revealed to you.</strong></p>

            <p><strong>The other participant’s choice was: Option ${detectedChoice}.</strong></p>

            <p><strong>Please choose again between options A and B.</strong></p>
            <p>This is the choice that will determine (dependent on the other participant's choice) the amount of money you will receive as a bonus reward on top of the money you receive for answering the questions afterwards.</p>
            <p>Here is a reminder of the possible results according to the choices made.</p><br>
            `;

            stimulusHTML += trial.stimulus;

            stimulusHTML += "<p><strong>This is your final choice. It will not be detected by the other participant.</strong></p><p>Please make your choice</p>";

            //Show the A and B buttons
            display_element.querySelector('#jspsych-html-button-response-btngroup').style.display = "inline-block";

        }else{ //If the choice was not detected
            stimulusHTML += `
            <div id="instructions-wrap">
            <p><strong>The random draw from the computer has determined that the other participant’s choice will NOT be revealed to you.</strong></p>

            <p><strong>Please click ‘Continue’ to proceed to the next part.</strong></p>
            `;

            //Show the Continue button
            display_element.querySelector('#continueButton').style.display = "inline-block";
        }
        stimulusHTML += "</div>";

        //Update the stimulus's html
        display_element.querySelector('#jspsych-html-button-response-stimulus').innerHTML = stimulusHTML;

        $(".choice-btn").click(function(e){
            //Get the text of the button clicked:
            var buttonText = e.target.textContent;

            //Modify it to get rid of 'Option '
            buttonText = buttonText.replace("Option ", "");

            //Start the response system:
            after_response(buttonText);
        });

    });
/* -------------------------------------------------------------------------- */

    // start time
    var start_time = performance.now();

/* -----------------------------Modification--------------------------------- */
    //This is where there was the bug where it couldn't access the button correctly. Commented it out.

    // // add event listeners to buttons
    // for (var i = 0; i < trial.choices.length; i++) {
    //   display_element.querySelector('#jspsych-html-button-response-button-' + i).addEventListener('click', function(e){
    //     var choice = e.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
    //     after_response(choice);
    //   });
    // }
/* -------------------------------------------------------------------------- */

    // store response
    var response = {
      rt: null,
      button: null
    };

    // function to handle responses by the subject
    function after_response(choice) {

      // measure rt
      var end_time = performance.now();
      var rt = end_time - start_time;
      response.button = choice;
      response.rt = rt;

      // after a valid response, the stimulus will have the CSS class 'responded'
      // which can be used to provide visual feedback that a response was recorded
      display_element.querySelector('#jspsych-html-button-response-stimulus').className += ' responded';

      // disable all the buttons after a response
      var btns = document.querySelectorAll('.jspsych-html-button-response-button button');
      for(var i=0; i<btns.length; i++){
        //btns[i].removeEventListener('click');
        btns[i].setAttribute('disabled', 'disabled');
      }

      if (trial.response_ends_trial) {
        end_trial();
      }
    };

    // function to end trial when it is time
    function end_trial() {

      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // gather the data to store for the trial
      var trial_data = {
        "rt": response.rt,
        "stimulus": trial.stimulus,
        "button_pressed": response.button
      };

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };

    // hide image if timing is set
    if (trial.stimulus_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        display_element.querySelector('#jspsych-html-button-response-stimulus').style.visibility = 'hidden';
      }, trial.stimulus_duration);
    }

    // end trial if time limit is set
    if (trial.trial_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        end_trial();
      }, trial.trial_duration);
    }

  };

  return plugin;
})();
