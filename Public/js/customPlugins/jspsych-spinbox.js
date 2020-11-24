/*
This is a custom jsPsych plugin to have a spinbox.
by Samuel Dupret
Based on the 'survey' plugins for jsPsych
*/


jsPsych.plugins['spinbox'] = (function() {
  var plugin = {};

  plugin.info = {
    name: 'spinbox',
    description: '',
    parameters: {
        min: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Minimum',
            default: 1,
            description: 'The minimum value for the spinbox.'
        },
        max: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Maximum',
            default: 100,
            description: 'The maximum value for the spinbox.'
        },
        step: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Step',
            default: 1,
            description: 'By how much the value is changed when the arrows are pressed.'
        },
        start_value: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Starting Value',
            default: null,
            description: 'The value the spinbox will start at.'
        },
        size: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Size',
            default: 10,
            description: 'The size of the spinbox.'
        },
        preamble: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Preamble',
            default: null,
            description: 'HTML formatted string to display at the top of the page above all the questions.'
        },
        button_label: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Button label',
            default: 'Continue',
            description: 'Label of the button.'
        }
    }
  };
  plugin.trial = function(display_element, trial) {
    //var plugin_id_name = "spinbox";

    var html = "";

    //Prepare a variable for the results:
    var textResults;
    // show preamble text
    if(trial.preamble !== null){
        html += '<div id="preamble">'+trial.preamble+'</div>';
        textResults = trial.preamble;
    }else{
        textResults = "NA";
    }

    //Get the start value
    var startValue;
    if(trial.start_value !== null){
        //If the start_value is not null (i.e., a start value was coded in), select it
        startValue = trial.start_value;
    }else{
        //If the start_value is null, set the startValue to the min value.
        startValue = trial.min;
    }

    // add the spinbox
    html += '<input type="number" id="the-spin-box" min="' + trial.min + '" max="' + trial.max + '" step="'+ trial.step + '" value="' + startValue + '" size="' + trial.size + '"></input>';

    // add button
    html += '<br><br><button id="spinboxButton" class="jspsych-btn">' + trial.button_label + '</button>';

    // render
    display_element.innerHTML = html;

    //add the function to get the data and end the trial:
    document.getElementById("spinboxButton").addEventListener("click", function(){
        // measure response time
        var endTime = performance.now();
        var response_time = endTime - startTime;

        //Prepare the stimulus information
        var stimulus_data = {
            min: trial.min,
            max: trial.max,
            step: trial.step,
            size: trial.size
        };
        if(trial.start_value !== null){
            //If the start_value is not null (i.e., a start value was coded in), select it
            stimulus_data.value = trial.start_value;
        }else{
            //If the start_value is null, select the min value.
            stimulus_data.value = trial.min;
        }

        // get the response
        var response = document.getElementById("the-spin-box").value;

        // save data
        var trial_data = {
          "rt": response_time,
          "response": response,
          "stimulus": JSON.stringify(stimulus_data),
          "preamble": textResults
        };

        //Reset the display_element
        display_element.innerHTML = '';

        // next trial
        jsPsych.finishTrial(trial_data);
    });

    //Start measuring the time
    var startTime = performance.now();
  };

  return plugin;
})();
