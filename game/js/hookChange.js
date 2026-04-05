// swapping hooks
var allowClick = true;

function changeHook(hookIndex) {

  // save hook data into temp var
  var scoutHook = starHooks[hookIndex];

  // check to see if star is dead, if yes perform no action
  if (scoutHook.star.alive === false) {
    return false;
  }

  if (allowClick === true) {
    allowClick = false;
    // detach from hook if already attached to one
    //if (selectedHook != null) {
      detach();
    //}

    // set global variables
    selectedHook = scoutHook;
    cameraFollowHook();
    selectedHook.selected = true;
    hookGrappel.launch = true;
    soundGrappelLaunch();

    // calculate how many frames the grappel will need to reach hook @60fps.
    var percent = (character.grappelDelay/1000);
    var frames = 60*percent;
    hookGrappel.interations = frames;
    hookGrappel.currentIteration = 0;

    setTimeout(function(){
      if (gameState != 'gameOver') {
        if (starImmunity.immune === true) {
          starImmunity = {
            immune: false,
            power: 0
          }
          selectedHook.star.safe = true;
        }
        attach();
        repositionSwing();
        hookGrappel.launch = false;
      }
      allowClick = true;
    },character.grappelDelay);
  }
}
