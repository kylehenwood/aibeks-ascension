// current game state // score
// - back to menu
// - restart
// - pause

var pauseMenuButton = {
  width: 272,
  height: 64,
  posX: null,
  posY: null,
  action: 'backToMenu',
  canvas: null,
  context: null
}
function repositionPauseButtons() {
  pauseMenuButton.posX = 24;
  pauseMenuButton.posY = camera.height - ((pauseMenuButton.height + 24) * 3);
  pauseRestartButton.posX = (camera.width / 2) - (pauseRestartButton.width / 2);
  pauseRestartButton.posY = camera.height - ((pauseRestartButton.height + 24) * 2);
  pauseResumeButton.posX = camera.width - pauseResumeButton.width - 24;
  pauseResumeButton.posY = camera.height - ((pauseResumeButton.height + 24) * 1);
}

function createPauseMenuButton(){
  var button = pauseMenuButton;
  button.posX = 24;
  button.posY = (camera.height)-((button.height+24)*3);

  button.canvas = document.createElement('canvas');
  button.canvas.width = button.width;
  button.canvas.height = button.height;
  button.context = button.canvas.getContext('2d');

  // button background
  button.context.beginPath();
  button.context.fillStyle = 'white';
  button.context.fillRect(0,0,button.width,button.height)
  button.context.closePath();

  // button text
  button.context.fillStyle = 'black';
  button.context.font = 'bold 18px sans-serif';
  button.context.textBaseline="middle";
  button.context.textAlign="center";
  button.context.fillText('Back to Menu', button.width/2, button.height/2);
}

//--
var pauseRestartButton = {
  width: 272,
  height: 64,
  posX: null,
  posY: null,
  action: 'restartGame',
  canvas: null,
  context: null
}
function createPauseRestartButton(){
  var button = pauseRestartButton;

  button.posX = 24;
  button.posY = (camera.height)-((button.height+24)*2);

  button.canvas = document.createElement('canvas');
  button.canvas.width = button.width;
  button.canvas.height = button.height;
  button.context = button.canvas.getContext('2d');

  // button background
  button.context.beginPath();
  button.context.fillStyle = 'white';
  button.context.fillRect(0,0,button.width,button.height)
  button.context.closePath();

  // button text
  button.context.fillStyle = 'black';
  button.context.font = 'bold 18px sans-serif';
  button.context.textBaseline="middle";
  button.context.textAlign="center";
  button.context.fillText('Restart', button.width/2, button.height/2);
}


//--
var pauseResumeButton = {
  width: 272,
  height: 64,
  posX: null,
  posY: null,
  action: 'resumeGame',
  canvas: null,
  context: null
}
function createPauseResumeButton(){
    var button = pauseResumeButton;

    button.posX = 24;
    button.posY = (camera.height)-((button.height+24)*1);

    button.canvas = document.createElement('canvas');
    button.canvas.width = button.width;
    button.canvas.height = button.height;
    button.context = button.canvas.getContext('2d');

    // button background
    button.context.beginPath();
    button.context.fillStyle = 'white';
    button.context.fillRect(0,0,button.width,button.height)
    button.context.closePath();

    // button text
    button.context.fillStyle = 'black';
    button.context.font = 'bold 18px sans-serif';
    button.context.textBaseline="middle";
    button.context.textAlign="center";
    button.context.fillText('Resume', button.width/2, button.height/2);
}
