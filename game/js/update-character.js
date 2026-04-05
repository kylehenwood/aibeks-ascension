  // update character
function updateCharacter() {
  //character.posX-(character.size/2);
  //character.posY-(character.size/2);

  character.posX = character.centerX-(character.size/2);
  character.posY = character.centerY-(character.size/2);
  //console.log('x:'+character.posX+',y:'+character.posY);
}

var characterCanvas = {}

function setupCharacter() {
  characterCanvas.canvas = document.createElement('canvas');
  characterCanvas.canvas.width = 64;
  characterCanvas.canvas.height = 64;
  characterCanvas.context = characterCanvas.canvas.getContext('2d');

  characterCanvas.context.beginPath();
  characterCanvas.context.rect(0,0,64,64);
  characterCanvas.context.fillStyle = 'white';
  characterCanvas.context.fill();

  var image = new Image(64, 64);   // using optional size for image
  image.onload = drawImageActualSize; // draw when image has loaded

  // load an image of intrinsic size 300x227 in CSS pixels
  //image.src = 'art/character/character-right.png';
}


function drawImageActualSize() {
  // use the intrinsic size of image in CSS pixels for the canvas element
  //canvas.width = this.naturalWidth;
  //canvas.height = this.naturalHeight;

  // will draw the image as 300x227 ignoring the custom size of 60x45
  // given in the constructor
  //characterContext.drawImage(this, 0, 0);

  // To use the custom size we'll have to specify the scale parameters
  // using the element's width and height properties - lets draw one
  // on top in the corner:
  characterCanvas.context.drawImage(this, 0, 0, this.width, this.height);
}




// draw character
function drawCharacter(context,state) {

  updateCharacter();

  context.beginPath();
  context.drawImage(characterCanvas.canvas,character.posX,character.posY);
  context.fill();
}



function characterReset() {
  //console.log('reset');
  character.centerX = (canvas.width/2);
  character.centerY = 0;
}



// when character is not attached, move it based on momentium and gravity
function characterFalling(context) {
  if (gameState === 'animateGameStart') {
    return;
  }
  if (gravity < terminalVelocity) {
    gravity += gravityIncrease*dt;
  } else {
    gravity = terminalVelocity;
  }
  character.centerY += gravity*dt;
  character.centerX += momentiumIncrease*dt;
}
