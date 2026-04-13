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
  gamePanel.canvas.height = camera.height;
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

// Check if a candidate grid position overlaps any existing star (64px tile size)
function starOverlaps(gridPos) {
  var size = gridSize.square; // 64
  for (var i = 0; i < starHooks.length; i++) {
    var dx = Math.abs(gridPos.positionX - starHooks[i].posX);
    var dy = Math.abs(gridPos.positionY - starHooks[i].posY);
    if (dx < size && dy < size) return true;
  }
  return false;
}

// Generate stars up to current gridSize.cols, continuing from last position
function generateStars() {
  var totalCols = gridSize.cols;
  var col = Math.floor(infiniteGen.lastPosition / gridSize.rows);
  var isFirst = (infiniteGen.totalStars === 0);

  while (col < totalCols) {
    // Difficulty scaling - column gap increases over time
    // Min gap of 4 cols (256px) ensures click areas (192px wide) never overlap
    // Early: 4-5 columns apart, Late: 6-8 columns apart
    var difficulty = Math.floor(infiniteGen.totalStars / 8);
    var minColGap = Math.min(4 + difficulty, 6);
    var maxColGap = Math.min(5 + difficulty, 8);

    if (col === 0) {
      col = 1;
    } else {
      col += rand(minColGap, maxColGap);
    }

    if (col < totalCols) {
      var row;
      if (isFirst) {
        row = 1;
      } else {
        // Pick a row that doesn't overlap any existing star
        row = rand(0, gridSize.rows - 1);
        var attempts = 0;
        while (attempts < 20) {
          var candidatePos = col * gridSize.rows + row;
          if (candidatePos < gridPositions.length && !starOverlaps(gridPositions[candidatePos])) break;
          row = rand(0, gridSize.rows - 1);
          attempts++;
        }
      }

      var position = col * gridSize.rows + row;
      if (position < gridPositions.length && !starOverlaps(gridPositions[position])) {
        createHook(position, isFirst);
        infiniteGen.totalStars++;
        infiniteGen.lastRow = row;
        isFirst = false;
      }
    }
  }

  infiniteGen.lastPosition = col * gridSize.rows;
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
  var startingX = (camera.width / 2) - 32 - infiniteGen.totalOffset;
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
  var cullX = -camera.x - camera.width * 2;
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
  var positionX = (camera.width/2) - 32;  // first star column centered on screen
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

// Draw subtle grid lines only in the visible area (no full-canvas image needed)
function drawVisibleGrid(context, viewLeft, viewRight) {
  var sq = gridSize.square;
  var rows = gridSize.rows;
  var gridStartX = (camera.width / 2) - 32 + 320 - infiniteGen.totalOffset;

  // Snap to grid boundaries
  var firstCol = Math.floor((viewLeft - gridStartX) / sq);
  var lastCol = Math.ceil((viewRight - gridStartX) / sq);

  context.strokeStyle = 'rgba(255,255,255,0.04)';
  context.lineWidth = 1;

  // Vertical lines
  for (var c = firstCol; c <= lastCol; c++) {
    var x = gridStartX + c * sq;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, rows * sq);
    context.stroke();
  }

  // Horizontal lines
  for (var r = 0; r <= rows; r++) {
    var y = r * sq;
    context.beginPath();
    context.moveTo(Math.max(viewLeft, gridStartX + firstCol * sq), y);
    context.lineTo(gridStartX + lastCol * sq, y);
    context.stroke();
  }
}
