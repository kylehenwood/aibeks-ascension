var restartStage = 1;
var once = true;

//restart game
function restartGame() {
  gameState = "gameRestart";
  restartStage = 1;
  camera.target = null; // manual control during animation
  detach();
}

// gameState === 'restartAnimation'
// once complete it starts a new game.
function restartAnimation() {

  // Stage 1: pan down (camera falls through clouds)
  if (restartStage === 1) {

    var anim = {
      from: camera.y,
      to: -canvas.height*1.5,
      duration: 60,
      easing: 'easeInQuad'
    }

    val = animateNum(anim.from,anim.to,anim.duration,anim.easing);

    camera.vy = val.value - camera.y;
    camera.y = val.value;

    if (val.complete === true) {
      clearVariables();
      gameSetup();
      // Center camera on first star immediately so the level is positioned correctly during stage 2
      var firstStar = starHooks[0];
      camera.x = (firstStar.posX - (canvas.width/2) + (firstStar.size/2)) * -1;
      camera.vx = 0;
      restartStage = 2;
    }
  }


  // Stage 2: new level rises from below
  if (restartStage === 2) {

    var anim = {
      from: canvas.height*1.5,
      to: 0,
      duration: 90,
      easing: 'easeOutQuad'
    }

    val = animateNum(anim.from,anim.to,anim.duration,anim.easing);

    camera.vy = val.value - camera.y;
    camera.y = val.value;

    if (val.complete === true) {
      restartStage = 3;
    }
  }


  // Stage 3: snap to first star and resume
  if (restartStage === 3) {
    restartStage = 0;

    // position character and reset physics
    physics.vx = 0;
    physics.vy = 0;
    character.centerY = -character.size;
    character.centerX = canvas.width/2;

    // center camera on the first star
    var firstStar = starHooks[0];
    camera.x = (firstStar.posX - (canvas.width/2) + (firstStar.size/2)) * -1;
    camera.vx = 0;
    camera.vy = 0;
    camera.y = 0;

    // resume target-following and start game
    cameraFollowHook();
    startGame();
  }
}
