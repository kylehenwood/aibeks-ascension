
// paint game canvas & hooks + clear visible area(not entire gameCanvas)
// updates the game canvas layer
// controls when there needs to be more panels created.
// animates the currently selected star
function updateGame() {

  // Infinite generation: spawn more stars when camera approaches the last star
  if (starHooks.length > 0) {
    var lastStarX = starHooks[starHooks.length - 1].posX;
    var cameraRight = -camera.x + camera.width;
    if (gameState === 'playGame' && cameraRight > lastStarX - camera.width * 2) {
      generateMoreStars();
    }
  }

  // World shift: keep canvas coordinates bounded when stars approach canvas edge
  if (starHooks.length > 0 && starHooks[starHooks.length - 1].posX > infiniteGen.canvasWidth - camera.width * 2) {
    shiftWorld();
  }

  // Cleanup: remove old stars far behind the camera
  cleanupOldStars();

  var gameCanvas = gamePanel.canvas;
  var gameContext = gamePanel.context;

  // Clear only visible area for performance on large canvases
  var viewLeft = Math.max(0, -camera.x - 200);
  var viewRight = Math.min(gameCanvas.width, -camera.x + camera.width + 200);
  gameContext.clearRect(viewLeft, 0, viewRight - viewLeft, camera.height);

  // Update distance score (furthest X reached)
  if (character.centerX > infiniteGen.startX) {
    var dist = character.centerX - infiniteGen.startX;
    if (dist > infiniteGen.maxDistance) {
      infiniteGen.maxDistance = dist;
    }
  }
  gameUserInterface.score = Math.floor(infiniteGen.maxDistance / 10);

  // Draw subtle grid lines in the visible area
  drawVisibleGrid(gameContext, viewLeft, viewRight);


  // if character is grappeling a hook
  if (character.swinging === true) {
    if (testingBool === true) {
      drawTrajectory(gameContext);
    }
    if (debugGrappleAssist === true) {
      drawGrappleAssist(gameContext);
    }
    drawRope(gameContext);
  }
  if (character.swinging === false){
    characterFalling(gameContext);
  }

  // Autoplay — runs after grapple assist computes best angle
  updateAutoplay();

  // Sparkle particles (render even when rope inactive so they fade out)
  if (physics.sparkles.length > 0 && !character.swinging) {
    physicsUpdateSparkles(dt, gameContext);
  }

  // launch grappel from character to hook
  if(hookGrappel.launch === true) {
    grappelLaunch(gamePanel.context);
  }

  // this is where I draw hooks to the game canvas.

  // Update selected hook if it exists
  if (selectedHook != null) {
    drawHook(selectedHook);
  }

  // draw each hook to this canvas (only visible ones for performance)
  for (var i = 0; i < starHooks.length; i++) {
    var hook = starHooks[i];
    if (hook.posX + hook.size >= viewLeft && hook.posX <= viewRight) {
      gameContext.drawImage(hook.layer, hook.posX, hook.posY);
    }
  }
}
