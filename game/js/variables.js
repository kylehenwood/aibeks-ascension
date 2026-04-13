// if (numWant > 0) {
//     speedToMove = (numWant-currentNum)/iterations
//     currentNum -= speedToMove;
// }


// Delta time - normalizes game speed to 60fps regardless of actual refresh rate
var dt = 1;
var lastFrameTime = 0;
var targetFrameMs = 1000 / 60; // 16.67ms per frame at 60fps

var renderScale = 2; // Render at 2x resolution for crisp visuals

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
var gridBaseX = 0; // X origin of grid column 0, adjusted by shifts
var gridSize = {
  rows: 10,
  cols: 100,
  square: 32
}

// Compute grid cell position from column and row — no array needed
function gridPosAt(col, row) {
  return {
    positionX: gridBaseX + col * gridSize.square,
    positionY: row * gridSize.square
  };
}

// Level state — scoring only (generation is handled by chunkManager)
var infiniteGen = {
  startX: 0,          // character starting X for distance score
  maxDistance: 0,      // furthest distance reached (for score)
  canvasWidth: 8000   // fixed game panel canvas width
}

var character = {
  size: 40,
  currentPosX: 0,
  currentPosY: 0,
  swinging: false,
  grappelDelay:160, // ms (this should change based on the distance the character is from the hook)
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
  galaxy:   0.03,    // galaxy blobs (deepest layer)
  bgStars1: 0.05,    // very distant tiny stars
  bgStars2: 0.15,    // distant stars
  bgStars3: 0.3,     // mid stars
  bgStars4: 0.5,     // near stars
  bgStars5: 0.7,     // close bright stars
  twinkle:  0.1,     // twinkle overlay
  gamePanel: 1.0,    // grapple stars + character (no parallax)
  cloud1:   1.16,    // background clouds
  cloud2:   1.4,     // small clouds
  cloud3:   1.64,    // tiny clouds (closest)
  platform: 1.28,    // island platform (between background and small clouds)
  logo:     0.3      // title text (behind, slow drift)
};

// Physics state is in physics.js (loaded before this file's consumers)
