function clearVariables() {
  gridPositions = [];
  elements = [];
  starHooks = [];

  // camera (preserve scrollX for seamless bg parallax)
  camera.x = 0;
  camera.y = 0;
  camera.vx = 0;
  camera.vy = 0;
  camera.targetX = 0;
  camera.targetY = 0;
  camera.ease = 16;
  camera.target = null;

  // reset physics
  physics.vx = 0;
  physics.vy = 0;
  physics.rope = [];
  physics.ropeActive = false;

  // reset character connection state
  character.swinging = false;
  starConnected = true;

  starImmunity.power = 0;

  gameUserInterface.score = 0;

  // Reset infinite generation state
  infiniteGen.lastPosition = 0;
  infiniteGen.startX = 0;
  infiniteGen.maxDistance = 0;
  infiniteGen.totalOffset = 0;
  infiniteGen.totalStars = 0;

  // Reset grid to initial size for fresh generation
  gridSize.cols = 50;
}
