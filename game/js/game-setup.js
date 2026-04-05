// game panel setup
var gamePanel = {
  canvas: '',
  context: '',
  posX:0,
  posY:0
}

function setupGameCanvas() {
  gamePanel.canvas = document.createElement('canvas');
  gamePanel.canvas.width = infiniteGen.canvasWidth;
  gamePanel.canvas.height = canvas.height;
  gamePanel.context = gamePanel.canvas.getContext('2d');
}

// ---------------------------------------------------------------
function gameSetup() {

  // create a grid canvas and push the positions of each square to an array called "elements"
  gridPosition = [];
  createGrid();

  // create a panel which I draw/place stars positions fitting that of the grid element positions.
  starHooks = [];
  elements = [];
  createPanel();

  // draw click area hotspots
  drawClicky();
  updateGame();
}

// create a canvas and draw the grid and stars/hooks on it.
// size
function createPanel() {
  infiniteGen.lastPosition = 0;
  generateStars();
}

// Generate stars up to current gridSize.cols, continuing from last position
function generateStars() {
  var availablePositions = gridSize.rows * gridSize.cols;
  var position = infiniteGen.lastPosition;
  var isFirst = (infiniteGen.totalStars === 0);

  while (position < availablePositions) {
    // Difficulty scaling - uses totalStars (not array length) so cleanup doesn't reset it
    // Gap increases by 1 grid position every 8 stars, capped to keep stars on-screen
    var difficulty = Math.floor(infiniteGen.totalStars / 8);
    var minGap = Math.min(18 + difficulty, 28);
    var maxGap = Math.min(26 + difficulty, 36);

    if (position === 0) {
      position = 2;
    } else {
      position += rand(minGap, maxGap);
    }

    if (position < availablePositions) {
      createHook(position, isFirst);
      infiniteGen.totalStars++;
      isFirst = false;
    }
  }

  infiniteGen.lastPosition = position;
}

// Extend the level by adding more columns, stars, and click areas
function generateMoreStars() {
  var oldCols = gridSize.cols;
  var newCols = oldCols + 30;
  gridSize.cols = newCols;

  // Extend grid positions (accounts for totalOffset)
  extendGridPositions(oldCols, newCols);

  // Generate new stars
  var oldElementCount = elements.length;
  generateStars();

  // Append click areas for new elements only
  for (var i = oldElementCount; i < elements.length; i++) {
    var element = elements[i];
    clickAreas.context.fillStyle = 'rgba(0,255,0,0.1)';
    clickAreas.context.fillRect(element.posX, element.posY, element.size, element.size);
  }
}

// Add grid positions for columns fromCol to toCols
// Subtracts totalOffset so new positions are in current canvas coordinates
function extendGridPositions(fromCol, toCols) {
  var startingX = (canvas.width / 2) - 32 + 320 - infiniteGen.totalOffset;
  for (var c = fromCol; c < toCols; c++) {
    var positionX = startingX + c * 64;
    for (var r = 0; r < gridSize.rows; r++) {
      gridPositions.push({
        positionX: positionX,
        positionY: r * 64
      });
    }
  }
}

// Shift all world positions back to keep canvas coordinates bounded.
// Called when the rightmost star approaches the canvas edge.
function shiftWorld() {
  // Shift so camera left edge lands at canvas X=1000
  var shiftAmount = -camera.x - 1000;
  if (shiftAmount <= 0) return;

  infiniteGen.totalOffset += shiftAmount;

  // Shift all star positions
  for (var i = 0; i < starHooks.length; i++) {
    starHooks[i].posX -= shiftAmount;
    starHooks[i].centerX -= shiftAmount;
  }

  // Shift click element positions
  for (var i = 0; i < elements.length; i++) {
    elements[i].posX -= shiftAmount;
  }

  // Shift character
  character.centerX -= shiftAmount;
  character.currentPosX -= shiftAmount;

  // Shift camera (do NOT shift scrollX — it accumulates independently for parallax)
  camera.x += shiftAmount;
  camera.targetX += shiftAmount;

  // Shift distance tracking
  infiniteGen.startX -= shiftAmount;

  // Shift rope physics points
  for (var i = 0; i < physics.rope.length; i++) {
    physics.rope[i].x -= shiftAmount;
    physics.rope[i].ox -= shiftAmount;
  }

  // Shift all grid positions so future createHook calls stay consistent
  for (var i = 0; i < gridPositions.length; i++) {
    gridPositions[i].positionX -= shiftAmount;
  }

  // Rebuild click areas canvas with shifted positions
  drawClicky();
}

// Remove stars that are far behind the camera to free memory
function cleanupOldStars() {
  var cullX = -camera.x - canvas.width * 2;
  var removed = 0;

  while (starHooks.length > 1 && starHooks[0].posX + starHooks[0].size < cullX) {
    // Never remove the currently selected hook
    if (selectedHook === starHooks[0]) break;
    starHooks.shift();
    elements.shift();
    removed++;
  }

  if (removed > 0) {
    // Re-index so element.index matches starHooks position
    for (var i = 0; i < starHooks.length; i++) {
      starHooks[i].star.index = i;
    }
    for (var i = 0; i < elements.length; i++) {
      elements[i].index = i;
    }
  }
}

// create grid and render it as a canvas.
function createGrid() {
  var gridCanvas = document.createElement('canvas');
      gridCanvas.width = gridSize.cols*gridSize.square;
      gridCanvas.height = gridSize.rows*gridSize.square;
  var gridContext = gridCanvas.getContext('2d');

  // pass canvas to external variable so it can be used elsewhere as an image
  gridImage = gridCanvas;

  var horizontal;
  var vertical;
  var positionX = 0+(canvas.width/2)-32+320;  // starting position of hooks
  var positionY = 0;
  var order;

  for (var i = 0; i < gridSize.cols; i++) {
    if (order === true) {
      order = false;
    } else {
      order = true;
    }
    drawCol(gridContext,positionX,order);
    positionX += 64;
  }
}

function drawCol(gridContext,positionX,order) {
 var positionY = 0;
 var squareColor;
 var order = order;

  // even or odd
  for (var i = 0; i < gridSize.rows; i++) {
    if (order === true) {
      order = false;
      squareColor = 'rgba(0,0,0,0.05)';
    } else {
      order = true;
      squareColor = 'rgba(0,0,0,0.1)';
    }
    drawSquare(gridContext,squareColor,64,positionX,positionY);
    positionY+=64;
  }
}

function drawSquare(gridContext,color,size,positionX,positionY) {
  gridContext.beginPath();
  gridContext.rect(positionX,positionY,size,size)
  gridContext.fillStyle = color;
  gridContext.fill();

  // create an array for grid positions that i'll use to place hooks.
  var position = {
    positionX: positionX,
    positionY: positionY
  }
  gridPositions.push(position);
}
