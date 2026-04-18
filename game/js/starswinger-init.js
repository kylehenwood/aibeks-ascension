 // Starwizard star test
(function() {

  // Create main canvases
  setupCanvas();
  setupGameCanvas();
  setupCharacter();
  gameResizeSetup();

  // Base
  controls();
  mouseTestSetup();
  setupMenuMouse();
  createMenu()

  // setup sub canvases
  pauseSetup();
  createIntro();

  setupGameOver();
  setupBackground();
  setupForeground();

  //loadAudio();
  soundToggle();
  createDebugPanel();
  createAutoplayPanel();
  createTabNavigation('game');

  // point at which game starts...
  var urlHash = window.location.hash;
  //console.log(urlHash);
  switch(urlHash) {
    case '#game-play': // play game
      character.centerY = -32;
      character.centerX = camera.width/2;
      gameMode = 'endless';
      gameSetup();
      startGame();
      break;
    case '#game-intro':
      setupIntro();
      break;
    case '#game-menu':
      setupMenu();
      break;
    case '#game-loading':
      setupLoading();
      break;

    default: setupLoading();
  }

  // RAF
  runGame();


}());

// setupCanvas() is now in canvas-setup.js (shared between game and sandbox)


// I want the game level & the game intro to co-exist.



// need to build a state engine or something
/*
  game.state = loading
  game.state = intro
  game.state = intro waiting (play now) + settings
  game.state = settings (settings:controls:stats)
  game.state = play
  game.state = play.pause
  game.state = play.pause.menu
  game.state = gameOver
*/
