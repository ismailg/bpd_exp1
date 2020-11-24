/*----------------------------------------------------------------------------*/
/*
This is a custom jsPsych plugin to have multiple dropdowns.
by Samuel Dupret
Based on the 'survey' plugins for jsPsych
*/


jsPsych.plugins['multi-dropdown'] = (function() {
  var plugin = {};

  plugin.info = {
    name: 'multi-dropdown',
    description: '',
    parameters: {
      questions: {
        type: jsPsych.plugins.parameterType.COMPLEX,
        array: true,
        pretty_name: 'Questions',
        nested: {
          prompt: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Prompt',
            default: undefined,
            description: 'The strings that will be associated with a group of options.'
          },
          options: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Options',
            array: true,
            default: undefined,
            description: 'Displays options for an individual question.'
          },
          required: {
            type: jsPsych.plugins.parameterType.BOOL,
            pretty_name: 'Required',
            default: false,
            description: 'Subject will be required to pick an option for each question.'
          },
          name: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Question Name',
            default: '',
            description: 'Controls the name of data values associated with this question'
          }
        }
      },
      randomize_question_order: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Randomize Question Order',
        default: false,
        description: 'If true, the order of the questions will be randomized'
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
        default:  'Continue',
        description: 'Label of the button.'
      }
    }
  }
  plugin.trial = function(display_element, trial) {
    var plugin_id_name = "multi-dropdown";

    var html = "";

    //Prepare a variable for the results:
    var textResults;
    // show preamble text
    if(trial.preamble !== null){
        html += '<div>'+trial.preamble+'</div>';
        textResults = trial.preamble;
    }else{
        textResults = "NA";
    }

    // form element
    html += '<form id="multi-dropdown-form">';

    // generate question order. this is randomized here as opposed to randomizing the order of trial.questions
    // so that the data are always associated with the same question regardless of order
    var question_order = [];
    for(var i=0; i<trial.questions.length; i++){
      question_order.push(i);
    }
    if(trial.randomize_question_order){
      question_order = jsPsych.randomization.shuffle(question_order);
    }

    // add multiple-choice questions
    for (var i = 0; i < trial.questions.length; i++) {

      // get question based on question_order
      var question = trial.questions[question_order[i]];
      //var question_id = question_order[i];

      html += '<div>';

      // add question text
      html += '<p>' + question.prompt
      if(question.required){
        html += "<span class='required'>*</span>";
      }
      html += '</p>';

      //Required?
      var required_attr = question.required ? 'required' : '';

      // create dropdown
      html += '<select name="' + question.name + '" id="multi-dropdown-' + i + '"' + required_attr + '>';

      //Create each option for the dropdown:
      for (var j = 0; j < question.options.length; j++) {
        if(question.required && j === 0){
            // if this is the first option and the question is required, make an empty value option:
            html += '<option value="">' + question.options[j] + '</option>';
        }else{
            // add option normally
            html += '<option value="'+question.options[j]+'">' + question.options[j] + '</option>';
        }
      }

      //Close this question
      html += '</select></div>';
    }

    // add submit button
    html += '<br><input type="submit" id="'+plugin_id_name+'-next" class="'+plugin_id_name+' jspsych-btn"' + (trial.button_label ? ' value="'+trial.button_label + '"': '') + '></input>';
    html += '</form>';

    // render
    display_element.innerHTML = html;

    document.querySelector('form').addEventListener('submit', function(event) {
        //Prevent the form from sending
        event.preventDefault();

        // measure response time
        var endTime = performance.now();
        var response_time = endTime - startTime;

        // create object to hold responses
        var question_data = {};
        var tmpDropdown, tmpDropdownID;
        for(var i=0; i<trial.questions.length; i++){
            tmpDropdownID = 'multi-dropdown-' + i; //get the dropdown's id
            tmpDropdown = document.getElementById(tmpDropdownID); //get dropdown

            //enter the data
            question_data[tmpDropdownID] = {
                name: tmpDropdown.name,
                response: tmpDropdown.value
            };
        }

        // save data
        var trial_data = {
            "rt": response_time,
            "responses": JSON.stringify(question_data),
            "question_order": JSON.stringify(question_order),
            "preamble": textResults
        };

        //Reset the display element
        display_element.innerHTML = '';

        // next trial
        jsPsych.finishTrial(trial_data);
    });

    //Start measuring time
    var startTime = performance.now();
  };

  return plugin;
})();
