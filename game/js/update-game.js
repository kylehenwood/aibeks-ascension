
// paint game canvas & hooks
// updates the game canvas layer (viewport-sized, drawn at screen coordinates)
// controls when there needs to be more panels created.
// animates the currently selected star
function updateGame() {

  // Chunk-based generation: load/unload chunks around camera
  chunkManager.ensureChunks(camera.x);

  var gameCanvas = gamePanel.canvas;
  var gameContext = gamePanel.context;

  // Clear entire viewport-sized canvas
  gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  // Translate so world coordinates map to screen positions
  var gpx = camera.x * parallax.gamePanel;
  var gpy = camera.y * parallax.gamePanel;
  gameContext.save();
  gameContext.translate(gpx, gpy);

  // Visible world range (for culling)
  var viewLeft = -gpx - 200;
  var viewRight = -gpx + camera.width + 200;

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

  // Update and draw shooting star hooks
  updateShootingStarHooks();
  drawShootingStarHooks(gameContext);

  // Update selected hook if it exists
  if (selectedHook != null) {
    drawHook(selectedHook);
  }

  // Animate dying stars (keep supernova running after the player detaches)
  for (var di = 0; di < starHooks.length; di++) {
    if (starHooks[di].star.dying && starHooks[di] !== selectedHook) {
      drawHook(starHooks[di]);
    }
  }

  // draw each hook to this canvas (only visible ones for performance).
  // Skip stars whose death animation has finished.
  for (var i = 0; i < starHooks.length; i++) {
    var hook = starHooks[i];
    if (hook.star.alive === false) continue;
    if (hook.posX + hook.size >= viewLeft && hook.posX <= viewRight) {
      gameContext.drawImage(hook.layer, hook.posX, hook.posY);
    }
  }

  gameContext.restore();
}
