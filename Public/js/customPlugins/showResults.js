/*----------------------------------------------------------------------------*/
/*
This is a custom jspPsych plugin to reveal the results of a Prisoner's Dilemma.
It waits for players to have both given their response before showing the results.
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

jsPsych.plugins["showResults"] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'showResults',
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
    html += '<div id="jspsych-html-button-response-btngroup" style="display: inline-block;>';
    for (var i = 0; i < trial.choices.length; i++) {
      var str = buttons[i].replace(/%choice%/g, trial.choices[i]);
      html += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-html-button-response-button-' + i +'" data-choice="'+i+'">'+str+'</div>';
    }
    html += '</div>';

    //show prompt if there is one
    if (trial.prompt !== null) {
      html += trial.prompt;
    }
    display_element.innerHTML = html;

/* -----------------------------Modification--------------------------------- */
    //Tell the server that this user is waiting
    socket.emit('player is waiting for results');

    //Start measuring how long the participant waits for the other player to make their translucent choice:
    var start_wait = performance.now();

    //Start a timeout that will tell the server that this user has waited for too long
    var longWaitTimeout = setTimeout(function(){
        socket.emit('waited too long', 'results');
    }, 240000); //Need to hardcode the time (currently, 4min)

    //Saving the display style of the element (because I don't know it)
    var savedDisplayStyle = display_element.querySelector('#jspsych-html-button-response-btngroup').style.display;

    //Hiding the button
    display_element.querySelector('#jspsych-html-button-response-btngroup').style.display = "none";

    socket.on('show results', function(resultsHTML){
        //Stop the timeout
        clearTimeout(longWaitTimeout);

        //Play bell sound because the other participant made their choice so the results can be shown.
        function playSound(soundObj) {
            var sound = document.getElementById(soundObj);
            sound.play();
        }
        playSound("bellSound");

        //Show the result text instead of the wait text
        $('#jspsych-html-button-response-stimulus').html(resultsHTML);

        //Show the button
        display_element.querySelector('#jspsych-html-button-response-btngroup').style.display = savedDisplayStyle;

        //Record how long the participant has waited for the other player to make their translucent choice
        var end_wait = performance.now();
        var translucent_wait = end_wait - start_wait;

        //Tell the server that this user received the results
        socket.emit('player received results');

        //Fixed a bug where the initial code was not accessing the right element for the button. Accessing it here with its class. Add an event that launches the end of the trial (the choice is the button's index which would be 0).
        $(".choice-btn").click(function(e){
            after_response(0, translucent_wait);
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

    // store response
    var response = {
      rt: null,
      button: null
    };

    // function to handle responses by the subject
    function after_response(choice, translucent_wait) {

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
        end_trial(translucent_wait);
      }
    };

    // function to end trial when it is time
    function end_trial(translucent_wait) {

      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // gather the data to store for the trial
      var trial_data = {
        "rt": response.rt,
        "stimulus": trial.stimulus,
        "button_pressed": response.button,
        "translucent_wait": translucent_wait
      };

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };

/* -------------------------------------------------------------------------- */

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
