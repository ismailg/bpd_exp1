//Checking userAgent information:
var userAgent = navigator.userAgent;
//If user is on mobile, or is using neither chrome or firefox...
if (
    userAgent.indexOf("Mobi") !== -1 ||
    userAgent.indexOf("Firefox") == -1 &&
    userAgent.indexOf("Chrome") == -1
){
    //Redirect to a page that asks them to come back with a different setup.
    window.location = "redirect.html";
}

//Preventing right click:
document.addEventListener("contextmenu", function(e){
  e.preventDefault();
}, false);

//Function that activates when the button is clicked...
function validateConsent(){

    //get the checkbox
    consentCheckbox = document.getElementById("consent_checkbox1");

    //If it is checked
    if(consentCheckbox.checked){

        //Send them to the study
        window.location = 'experiment.html'

    }else{//if it is not checked

        //Send an alert warning that they must consent to be able to continue
        alert("To continue, you must read and consent to the conditions of this study. Please check the consent checkbox in order to continue to the study.");
    }
}
