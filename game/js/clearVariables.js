function clearVariables() {
  gridPositions = [];
  elements = [];
  starHooks = [];

  // camera — preserve x/y position for seamless transitions
  camera.vx = 0;
  camera.vy = 0;
  camera.targetX = camera.x;
  camera.targetY = camera.y;
  camera.ease = 16;
  camera.target = null;

  // reset physics
  physics.vx = 0;
  physics.vy = 0;
  physics.rope = [];
  physics.ropeActive = false;
  physics.sparkles = [];

  // reset character connection state
  character.swinging = false;
  starConnected = true;

  starImmunity.power = 0;

  gameUserInterface.score = 0;
  gameMode = null;
  hookAlpha = 0;

  // Reset infinite generation state
  infiniteGen.lastPosition = 0;
  infiniteGen.startX = 0;
  infiniteGen.maxDistance = 0;
  infiniteGen.totalOffset = 0;
  infiniteGen.totalStars = 0;
  infiniteGen.lastRow = -1;

  // Reset grid to initial size for fresh generation
  gridSize.cols = 50;

  // Clear all collision surfaces
  removeAllSurfaces();
  start.platformSurface = null;
  start.platformExiting = false;
}
