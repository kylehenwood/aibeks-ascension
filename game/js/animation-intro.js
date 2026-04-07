// game intro (after load)
// slow -- 5/8 seconds

// animates from stars down, introducing the character and title.
var intro = {
  val: 0,
  speed: 320
}

function setupIntro() {
  backToMenu();
  return;
  
  gameState = 'gameIntro';
  menuStage = 1;

  // make sure elements used in this comp are set to invisible.
  logo.alpha = 0;
  playButton.alpha = 0;
  menuAlpha = 0;
  intro.val = 0;
  camera.y = 25;
  camera.target = null;
}

function createIntro() {}
function updateIntro() {
  if (intro.val < 50) {
    intro.val+= 1;
  }

  character.centerX = camera.width/2;
  character.centerY = camera.height/2;

  if (camera.y > 0) {
    camera.vy = -0.5;
    camera.y += camera.vy * dt;
  }


  if (intro.val >= 50) {
    camera.y = 0;
    camera.vy = 0;
    backToMenu();
  }

  //console.log(character.centerY);
  //console.log('updateIntro');
}
