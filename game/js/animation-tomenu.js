
function backToMenu() {
  gameState = 'menuAnimation';
  menuStage = 1;
  menuAlpha = 0;

  logo.alpha = 0;
  logo.posX = (canvas.width/2)-(logo.width/2);

  playButton.alpha = 0;

  platform.posX = (canvas.width/2)-(platform.width/2);

  // set character position
  character.centerY = -100;
  character.centerX = canvas.width/2;
  menuGravity = 0;
}

// end game
var menuStage = 1;
var menuAlpha = 0;
var menuGravity = 0;

// gameState === 'restartAnimation'
// once complete it starts a new game.
function animateToMenu() {

  // set character to center of the screen;
  character.centerX = canvas.width/2;

  // ::Stage 1
  // push out current game state.
  if (menuStage === 1) {
    camera.target = null;

    var anim = {
      from: camera.y,
      to: -canvas.height*5,
      duration: 100,
      easing: 'easeInQuad'
    }

    val = animateNum(anim.from,anim.to,anim.duration,anim.easing);

    camera.vy = val.value - camera.y;
    camera.y = val.value;

    if (val.complete === true) {
      camera.x = 0;
      clearVariables();
      gameSetup();
      menuStage = 2;
    }
  }


  // ::Stage 2
  if (menuStage === 2) {

    var anim = {
      from: canvas.height*1.5,
      to: 0,
      duration: 80,
      easing: 'easeOutQuad'
    }

    val = animateNum(anim.from,anim.to,anim.duration,anim.easing);

    camera.vy = val.value - camera.y;
    camera.y = val.value;

    // if animation finished
    if (val.complete === true) {
      menuStage = 3;
    }

    // fade in title
    if (logo.alpha < 1) {
      logo.alpha += 0.01;
    }
    if (menuAlpha < 1) {
      menuAlpha += 0.01;
    }

    var context = canvas.context;

    // floating platform
    context.drawImage(platform.canvas,platform.posX,platform.posY+camera.y*0.6)

    context.save();
    context.globalAlpha = logo.alpha;

    // game logo
    context.drawImage(logo.canvas, logo.posX, logo.posY+camera.y*0.2);
    // intro buttons
    context.drawImage(themeButton.canvas,themeButton.posX,themeButton.posY);
    context.drawImage(soundButton.canvas,soundButton.posX,soundButton.posY);
    context.drawImage(settingsButton.canvas,settingsButton.posX,settingsButton.posY);

    canvas.context.restore();

    // end
    if (val.complete === true) {
      menuStage = 3;
    }
  }


  // ::Stage 3
  // include title sequence and raise character platform
  // character fall => play button visualised.

  if (menuStage === 3) {
    // play button
    if (playButton.progress < 100) {
      updatePlayButton();
    }
    if (playButton.alpha < 1) {
      playButton.alpha += 0.1;
    } else {
      playButton.alpha = 1;
    }

    // hide square character - wizard is drawn on the platform canvas
    character.centerY = -200;

    var context = canvas.context;
    // play button
    context.drawImage(playButton.canvas,playButton.posX,playButton.posY);
    // floating platform
    context.drawImage(platform.canvas,platform.posX,platform.posY)
    // game logo
    context.drawImage(logo.canvas, logo.posX, logo.posY);
    // intro buttons
    context.drawImage(themeButton.canvas,themeButton.posX,themeButton.posY);
    context.drawImage(soundButton.canvas,soundButton.posX,soundButton.posY);
    context.drawImage(settingsButton.canvas,settingsButton.posX,settingsButton.posY);

    // end
    if (playButton.alpha >= 1 && playButton.progress >= 100) {
      setPlayButton();
      menuStage = 0;
      logo.alpha = 0;

      // set state to intro
      gameState = "gameMenu";
    }
  }
}
