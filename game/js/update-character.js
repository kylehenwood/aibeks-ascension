  // update character
function updateCharacter() {
  character.posX = character.centerX-(character.size/2);
  character.posY = character.centerY-(character.size/2);
}

var characterCanvas = {}

// sprite images
var characterSprites = {
  left: null,
  right: null,
  stand: null,
  loaded: 0,
  total: 3,
  facing: null // current facing direction
}

function setupCharacter() {
  var s = character.size;
  characterCanvas.canvas = document.createElement('canvas');
  characterCanvas.canvas.width = s;
  characterCanvas.canvas.height = s;
  characterCanvas.context = characterCanvas.canvas.getContext('2d');

  // Draw white circle
  drawCharacterCircle();
}

function drawCharacterCircle() {
  var s = character.size;
  var ctx = characterCanvas.context;
  ctx.clearRect(0, 0, s, s);
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.375, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
}

// draw character
function drawCharacter(context,state) {
  updateCharacter();
  context.drawImage(characterCanvas.canvas,character.posX,character.posY);
}



function characterReset() {
  //console.log('reset');
  character.centerX = (canvas.width/2);
  character.centerY = 0;
}



// when character is not attached, move it based on velocity and gravity
function characterFalling(context) {
  if (gameState === 'starting') {
    return;
  }
  // Always apply velocity; only accumulate gravity when enabled
  if (debugGravityEnabled) {
    physics.vy += physics.GRAVITY * dt;
    if (physics.vy > physics.TERMINAL_VELOCITY) {
      physics.vy = physics.TERMINAL_VELOCITY;
    }
  }
  character.centerX += physics.vx * dt;
  character.centerY += physics.vy * dt;

  // Check collisions with registered surfaces (platform, etc.)
  checkSurfaceCollisions();
}
