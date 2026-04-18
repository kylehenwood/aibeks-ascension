function clearVariables() {
  elements = [];
  starHooks = [];
  chunkManager.reset();

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

  // Reset star charge
  starCharge.power = 0;
  starCharge.charged = false;

  gameUserInterface.score = 0;
  gameMode = null;
  hookAlpha = 0;

  // Reset scoring
  infiniteGen.startX = 0;
  infiniteGen.maxDistance = 0;

  // Clear all collision surfaces
  removeAllSurfaces();
  start.platformSurface = null;
  start.platformExiting = false;
}
