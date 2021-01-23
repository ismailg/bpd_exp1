/*----------------------------------------------------------------------------*/
/*
This is a custom jsPsych plugin that asks for participants' choices only after each player is ready.
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

jsPsych.plugins["askForChoice"] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'askForChoice',
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

    // display stimulus
    var html = '<div id="jspsych-html-button-response-stimulus">'+trial.stimulus+'</div>';

/* -----------------------------Modification--------------------------------- */

    //Add a prompt to have particpants wait:
    html += '<div id="wait-prompt"><p>Please wait whilst the other participant finishes reading the instructions so that you can both start the experiment together.</p><p>This should not take more than a few minutes.</p><p>Please do not refresh or leave the experiment or we will not be able to pay you.</p><p>A bell sound will play when the experiment is ready to continue.</p></div>';

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
    html += '<div id="jspsych-html-button-response-btngroup" style="display: inline-block;">'; //Added a " add th end of block;, otherwise it made my first button bug
    for (var i = 0; i < trial.choices.length; i++) {
      var str = buttons[i].replace(/%choice%/g, trial.choices[i]);
      html += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-html-button-response-button-' + i +'" data-choice="'+i+'">'+str+'</div>';
    }
    html += '</div>';

/* -------------------------------------------------------------------------- */

    //show prompt if there is one
    if (trial.prompt !== null) {
      html += trial.prompt;
    }

    //Send html to the display element
    display_element.innerHTML = html;

/* -----------------------------Modification--------------------------------- */
    //Tell the server that this user is waiting
    socket.emit('player is waiting to choose');

    //Start a timeout that will tell the server that this user has waited for too long
    var longWaitTimeout = setTimeout(function(){
        socket.emit('waited too long', 'instructions');
    }, 300000); //Need to hardcode the time (currently, 5min)

    //Hide the stimulus
    display_element.querySelector('#jspsych-html-button-response-stimulus').style.display = "none";

    //Saving the display style of the element (because I don't know it)
    var savedDisplayStyle = display_element.querySelector('#jspsych-html-button-response-btngroup').style.display;

    //Hide the buttons
    display_element.querySelector('#jspsych-html-button-response-btngroup').style.display = "none";

    socket.on('ask for choice', function(){
        //Stop the timeout
        clearTimeout(longWaitTimeout);

        //Play bell sound because the other participant finished reading the instructions
        function playSound(soundObj) {
            var sound = document.getElementById(soundObj);
            sound.play();
        }
        playSound("bellSound");

        //Show the stimulus
        display_element.querySelector('#jspsych-html-button-response-stimulus').style.display = "block";

        //Hide the wait prompt
        display_element.querySelector('#wait-prompt').style.display = "none";

        //Show the buttons
        display_element.querySelector('#jspsych-html-button-response-btngroup').style.display = savedDisplayStyle;

        //Fixed a bug where the initial code was not accessing the right element for the button. Accessing it here with its class. Add an event that launches the end of the trial
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
