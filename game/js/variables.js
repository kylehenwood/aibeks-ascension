// if (numWant > 0) {
//     speedToMove = (numWant-currentNum)/iterations
//     currentNum -= speedToMove;
// }


// Delta time - normalizes game speed to 60fps regardless of actual refresh rate
var dt = 1;
var lastFrameTime = 0;
var targetFrameMs = 1000 / 60; // 16.67ms per frame at 60fps

var canvas = {
    id: '',
    context: '',
    width: '',
    height: ''
}

var gameOver = {
  canvas: null,
  context: null
}

// which state is the game currently in.
var gameState = null;

var gameUserInterface = {
  score: null
}

var testingBool = false;

// Storing the selected hook
var selectedHook; // selectedHook test is updated with the selected hook

var hookGrappel = {
  launch: false,
  time: null,
  interations: null,
  currentIteration: null
}

// Setup variables
var starHooks = [];
var gridPositions = [];
var gridImage;
var gridSize = {
  rows: 5,
  cols: 250,
  square: 64
}

// character
var gravity = 0;
var terminalVelocity = 11;
var gravityIncrease = 0.2;
var momentiumY;
var momentiumX;
var friction;

var character = {
  size: 64,
  currentPosX: 0,
  currentPosY: 0,
  ropeLength: 320,
  interations: 16, // times it takes for the character to catch the hook
  swinging: false,
  grappelDelay:320, // ms (this should change based on the distance the character is from the hook)
  centerX: 0,
  centerY: 0,
}

// Special
var starImmunity = {
    power: 0,
    immune: false
}



// Rope & angle
var maxAngle; // greatest angle of swing
var maxAngleIncrement; // if swing angle isn't 90 deg, increase swing speed on down untill it is.
var currentAngle; //angle in degrees - also the starting position when you connect to a new star
let momentiumIncrease = 0;
var momentiumAngle;
var swingDirection;
var swingSpeed = 0.07;
var maxSpeed = 2;
// !IDEA give momentium boost when character connects to a new hook.
// draw the rope that connects character to hook

// When a hook is clicked, recaluculate the swing based on the selected hook and the character
// position.
var trajectory = {
  characterPosX: null,
  characterPosY: null,
  starPosX: null,
  starPosY: null,
  angle: null,
  hypotenuse: null,
  radius: null,
}
