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

// Game mode: 'endless' or 'platform'
var gameMode = null;

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
  cols: 50,
  square: 64
}

// Infinite level generation state
var infiniteGen = {
  lastPosition: 0,    // last grid position index used for star placement
  startX: 0,          // character starting X for distance score
  maxDistance: 0,      // furthest distance reached (for score)
  totalOffset: 0,     // cumulative world shift applied (for keeping coords bounded)
  canvasWidth: 8000,  // fixed canvas width (never grows)
  totalStars: 0,      // total stars ever generated (for difficulty, not affected by cleanup)
  lastRow: -1         // row of last placed star (to avoid same-row placement)
}

var character = {
  size: 40,
  currentPosX: 0,
  currentPosY: 0,
  swinging: false,
  grappelDelay:320, // ms (this should change based on the distance the character is from the hook)
  centerX: 0,
  centerY: 0,
}

// Hook fade-in alpha (0 = invisible, 1 = fully visible)
var hookAlpha = 0;

// Special
var starImmunity = {
    power: 0,
    immune: false
}



// Parallax depth config — 0 = fixed/infinitely far, 1 = moves with camera, >1 = foreground
// Parallax depth config — 1 = moves 1:1 with camera (no relative parallax)
// < 1 = behind (moves slower than camera, appears distant)
// > 1 = in front (moves faster than camera, appears close)
var parallax = {
  bgStars1: 0.05,    // very distant tiny stars
  bgStars2: 0.15,    // distant stars
  bgStars3: 0.3,     // mid stars
  bgStars4: 0.5,     // near stars
  bgStars5: 0.7,     // close bright stars
  twinkle:  0.1,     // twinkle overlay
  gamePanel: 1.0,    // grapple stars + character (no parallax)
  cloud1:   1.2,     // background clouds
  cloud2:   1.5,     // small clouds
  cloud3:   1.8,     // tiny clouds (closest)
  platform: 1.6,     // island platform (menu only, in front)
  logo:     0.3      // title text (behind, slow drift)
};

// Physics state is in physics.js (loaded before this file's consumers)
