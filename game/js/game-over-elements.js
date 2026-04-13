//--
var restartButton = {
  width: 240,
  height: 64,
  posX: null,
  posY: null,
  action: 'restartGame',
  canvas: null,
  context: null
}
function createRestartButton(data){
  restartButton.posX = 24;
  restartButton.posY = camera.height - restartButton.height - 24;

  restartButton.canvas = document.createElement('canvas');
  restartButton.canvas.width = restartButton.width;
  restartButton.canvas.height = restartButton.height;
  restartButton.context = restartButton.canvas.getContext('2d');

  // button background
  restartButton.context.beginPath();
  restartButton.context.fillStyle = 'white';
  restartButton.context.fillRect(0,0,restartButton.width,restartButton.height)
  restartButton.context.closePath();

  // button text
  restartButton.context.fillStyle = 'black';
  restartButton.context.font = 'bold 18px sans-serif';
  restartButton.context.textBaseline="middle";
  restartButton.context.textAlign="center";
  restartButton.context.fillText('Restart Game (R)', restartButton.width/2, restartButton.height/2);
}

//--

var introButton = {
  width: 240,
  height: 64,
  posX: null,
  posY: null,
  action: 'backToMenu',
  canvas: null,
  context: null
}
function createIntroButton(){
  introButton.posX = camera.width - introButton.width - 24;
  introButton.posY = camera.height - introButton.height - 24;


  introButton.canvas = document.createElement('canvas');
  introButton.canvas.width = introButton.width;
  introButton.canvas.height = introButton.height;
  introButton.context = introButton.canvas.getContext('2d');

  // button background
  introButton.context.beginPath();
  introButton.context.fillStyle = 'white';
  introButton.context.fillRect(0,0,introButton.width,introButton.height)
  introButton.context.closePath();

  // button text
  introButton.context.fillStyle = 'black';
  introButton.context.font = 'bold 18px sans-serif';
  introButton.context.textBaseline="middle";
  introButton.context.textAlign="center";
  introButton.context.fillText('Back to Menu (Space)', introButton.width/2, introButton.height/2);
}
