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

// Setup
function setupCanvas() {
    // need to recall this on resize
    canvas.id = document.getElementById('js-starswinger');
    canvas.context = canvas.id.getContext("2d");

    canvas.width = 1200;
    canvas.height = 640;

    // set canvas width and height.
    canvas.id.setAttribute('width', canvas.width);
    canvas.id.setAttribute('height', canvas.height);
}


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
