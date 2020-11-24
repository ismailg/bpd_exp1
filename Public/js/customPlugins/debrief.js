/*----------------------------------------------------------------------------*/
/*
This is a custom jsPsych plugin that shows participants the debrief.
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

jsPsych.plugins["debrief"] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'debrief',
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
    //Prepare display stimulus
    var displayStimulus = trial.stimulus;

    //Ask server if this participant had the other participant timeout on them
    socket.emit("isTimeout?");

    //Receive response from the server
    socket.on("timeout information", function(timeoutInfo){
        //If the other participant did timeout on them
        if(timeoutInfo !== "none"){
            //inform the participant of this situation
            displayStimulus += "<p>We are sorry to report that, during the experiment, the other participant took too long to make their choice. To avoid you waiting too long, we decided to randomly generate a choice that would serve as their choice and allow you to continue the experiment. Your data is still valid and you will still be paid.</p>"
        }

        //Add researcher information:
        displayStimulus += `<div>
        				<p>Here is the contact information about the research team that was presented to you in the consent form:</p>
        				<ul>
        				<li><strong>Department: </strong>UCL Experimental Psychology</li>
        				<li><strong>Name and contact details of the researchers: </strong>Samuel Dupret (samuel.dupret.19@ucl.ac.uk), Dr. Maarten Speenkenbrink (m.speekenbrink@ucl.ac.uk), & Prof. David Lagnado (d.lagnado@ucl.ac.uk)</li>
        				<li><strong>Name and contact details of the UCL Data Protection Officer: </strong>Lee Shailer (data-protection@ucl.ac.uk)</li>
        				<li>This study has been <strong>approved by UCL Experimental Psychology Ethics Chair</strong> [Project ID: EP/2014/005]</li>
        				</ul>
        			</div>`

        displayStimulus += "If you wish to raise a complaint about any aspect of this study, you should contact the Principal Researcher in the first instance. If you feel your complaint has not been handled to your satisfaction you can contact the Chair of the UCL Research Ethics Committee at ethics@ucl.ac.uk."

        //Add the indication about the prolific button
        displayStimulus += "<p><strong>Please press this button to continue to Prolific for your payment (it is fine to leave the page by pressing this button).</strong></p>";

        // Send to display stimulus
        //Injected style to make left aligned
        var html = '<div id="jspsych-html-button-response-stimulus" style="text-align: left;">'+displayStimulus+'</div>';

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

        //Get the button to activate the end of the trial
        $(".choice-btn").click(function(e){
            //Get the text of the button clicked:
            var buttonText = e.target.textContent;

            //Start the response system:
            after_response(buttonText);
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


    });


    };
  return plugin;
})();
