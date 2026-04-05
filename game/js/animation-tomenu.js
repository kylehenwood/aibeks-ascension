
var menuFirstLoad = true;

function backToMenu() {
  gameState = 'menuAnimation';
  menuAlpha = 0;

  logo.alpha = 0;
  logo.posX = (canvas.width/2)-(logo.width/2);

  playButton.alpha = 0;

  platform.posX = (canvas.width/2)-(platform.width/2);

  // set character position
  character.centerY = -100;
  character.centerX = canvas.width/2;
  menuGravity = 0;

  if (menuFirstLoad) {
    // First time — slowly pan down to reveal platform and menu
    menuFirstLoad = false;
    camera.target = null;
    camera.y = canvas.height;
    camera.vy = 0;
    gameSetup();
    menuStage = 2;
  } else {
    // Returning from gameplay — pan down like restart, transition into menu
    camera.target = null;
    menuPanProgress = 0;
    menuPanReset = false;
    menuStage = 1;
  }
}

// end game
var menuStage = 1;
var menuAlpha = 0;
var menuGravity = 0;
var menuPanProgress = 0;
var menuPanReset = false;

// gameState === 'restartAnimation'
// once complete it starts a new game.
function animateToMenu() {

  // set character to center of the screen;
  character.centerX = canvas.width/2;

  // ::Stage 1 — pan down: old level exits up, menu enters from below
  if (menuStage === 1) {
    var duration = 180;
    var panDistance = canvas.height * 2;

    menuPanProgress += (1 / duration) * dt;
    if (menuPanProgress > 1) menuPanProgress = 1;

    // Sine-based speed: slow → fast → slow
    var panSpeed = Math.sin(menuPanProgress * Math.PI) * 18;
    camera.vy = -panSpeed;
    camera.scrollY += camera.vy * dt;

    // Game panel position: fake the transition
    if (menuPanProgress < 0.5) {
      // Old level slides up and out
      var t = menuPanProgress * 2;
      var ease = t * t * t;
      camera.y = -ease * panDistance;
    } else {
      // Menu enters from below
      var t = (menuPanProgress - 0.5) * 2;
      var ease = 1 - (1 - t) * (1 - t) * (1 - t);
      camera.y = (1 - ease) * panDistance;
    }

    // Reset at the midpoint
    if (!menuPanReset && menuPanProgress >= 0.45) {
      menuPanReset = true;
      clearVariables();
      gameSetup();
      camera.x = 0;
      camera.y = canvas.height * 3;
      return;
    }

    if (menuPanProgress >= 1) {
      camera.y = 0;
      camera.vy = 0;
      menuStage = 2;
    }
  }


  // ::Stage 2 — pan camera to reveal menu (intro) or fade in elements (from game)
  if (menuStage === 2) {

    // If camera.y isn't 0, animate it there (intro pan)
    if (Math.abs(camera.y) > 1) {
      var anim = {
        from: camera.y,
        to: 0,
        duration: 180,
        easing: 'easeInOutCubic'
      }

      val = animateNum(anim.from,anim.to,anim.duration,anim.easing);

      camera.vy = val.value - camera.y;
      camera.y = val.value;

      if (val.complete === true) {
        camera.y = 0;
        camera.vy = 0;
      }
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

    // Move to stage 3 once faded in and camera settled
    if (logo.alpha >= 1 && menuAlpha >= 1 && Math.abs(camera.y) <= 1) {
      camera.y = 0;
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
