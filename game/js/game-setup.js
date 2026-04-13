// game panel setup
var gamePanel = {
  canvas: '',
  context: '',
  posX:0,
  posY:0
}

function setupGameCanvas() {
  gamePanel.canvas = document.createElement('canvas');
  gamePanel.canvas.width = camera.width;
  gamePanel.canvas.height = camera.height;
  gamePanel.context = gamePanel.canvas.getContext('2d');
}

// ---------------------------------------------------------------
// Sets up a fresh level.
// firstStarTargetX: world X where the first star should appear.
// If omitted, defaults to screen center based on current camera.
function gameSetup(firstStarTargetX) {

  if (firstStarTargetX === undefined) {
    firstStarTargetX = -camera.x + camera.width / 2;
  }

  // Position grid so chunk 0's first star (~column 10) lands near the target
  gridBaseX = Math.round((firstStarTargetX - 10 * gridSize.square) / gridSize.square) * gridSize.square;

  // Reset chunk manager (new seed), generate only forward chunks
  chunkManager.reset();
  chunkManager.loadIfNeeded(0);
  chunkManager.loadIfNeeded(1);
  drawClicky();
}

// Check if a candidate position conflicts with any existing star:
// 1. Never share a vertical grid column (star canvas is 64px = 2 grid cols)
// 2. Click areas (128x128) must never overlap
function starOverlaps(posX, posY) {
  var starWidth = 64;  // star canvas spans 2 grid columns
  var clickSize = 128; // 64 + 32px padding each side
  for (var i = 0; i < starHooks.length; i++) {
    var dx = Math.abs(posX - starHooks[i].posX);
    var dy = Math.abs(posY - starHooks[i].posY);
    // Reject if stars share any vertical column
    if (dx < starWidth) return true;
    // Reject if click areas overlap
    if (dx < clickSize && dy < clickSize) return true;
  }
  return false;
}

// Draw subtle grid lines only in the visible area
function drawVisibleGrid(context, viewLeft, viewRight) {
  var sq = gridSize.square;
  var rows = gridSize.rows;

  // Snap to grid boundaries
  var firstCol = Math.floor((viewLeft - gridBaseX) / sq);
  var lastCol = Math.ceil((viewRight - gridBaseX) / sq);

  context.strokeStyle = 'rgba(255,255,255,0.04)';
  context.lineWidth = 1;

  // Vertical lines
  for (var c = firstCol; c <= lastCol; c++) {
    var x = gridBaseX + c * sq;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, rows * sq);
    context.stroke();
  }

  // Horizontal lines
  for (var r = 0; r <= rows; r++) {
    var y = r * sq;
    context.beginPath();
    context.moveTo(Math.max(viewLeft, gridBaseX + firstCol * sq), y);
    context.lineTo(gridBaseX + lastCol * sq, y);
    context.stroke();
  }
}
