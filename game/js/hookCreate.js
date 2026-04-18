// Create a star at an arbitrary world position (not grid-snapped)
function createStarAtWorld(worldX, worldY, isSafe) {
  var canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
  var context = canvas.getContext('2d');
  var hookPosition = starHooks.length;

  var star = {
    centerX: 32,
    centerY: 32,
    size: 6,
    strokeOffset: 16,
    bounds: 64,
    ring: 2,
    alive: true,
    safe: isSafe,
    immune: false,
    index: hookPosition
  }

  var hookSize = 64;
  // Center the 64x64 canvas on the target world position
  var posX = worldX - hookSize / 2;
  var posY = worldY - hookSize / 2;

  starHooks.push({
    layer: canvas,
    context: context,
    star: star,
    size: hookSize,
    selected: false,
    posX: posX,
    posY: posY,
    centerX: worldX,
    centerY: worldY,
    chunkIndex: -1  // not part of any chunk (player-created)
  });

  drawHook(starHooks[hookPosition]);

  // clickable areas
  var clickyBounds = 32;
  elements.push({
    posX: posX - clickyBounds,
    posY: posY - clickyBounds,
    size: 64 + (clickyBounds * 2),
    index: hookPosition,
    chunkIndex: -1
  });

  return hookPosition;
}

// create a hook along with a canvas it is drawn on.
function createHook(col, row, isSafe, chunkIndex) {
  var pos = gridPosAt(col, row);

  // create a mini canvas for a hook, and add it to an array of hooks.
  var canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
  var context = canvas.getContext('2d');
  var hookPosition = starHooks.length;

  var star = {
    centerX: 32,
    centerY: 32,
    size: 6,
    strokeOffset: 16,
    bounds: 64,
    ring: 2,
    alive: true,
    immune: false,
    index: hookPosition
  }

  var hookSize = 64;

  starHooks.push({
    layer: canvas,
    context: context,
    star: star,
    size: hookSize,
    selected: false,
    posX: pos.positionX,
    posY: pos.positionY,
    centerX: pos.positionX + (hookSize / 2),
    centerY: pos.positionY + (hookSize / 2),
    chunkIndex: chunkIndex !== undefined ? chunkIndex : 0
  });

  drawHook(starHooks[hookPosition]);

  // clickable areas
  var clickyBounds = 32;
  elements.push({
    posX: pos.positionX - clickyBounds,
    posY: pos.positionY - clickyBounds,
    size: 64 + (clickyBounds * 2),
    index: hookPosition,
    chunkIndex: chunkIndex !== undefined ? chunkIndex : 0
  });
}
