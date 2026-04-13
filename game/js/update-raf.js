//
// RAF ----------------------------------------------------------------------------
//

var camera = {
  x: 0,            // current horizontal position
  y: 0,            // current vertical position
  vx: 0,           // horizontal velocity
  vy: 0,           // vertical velocity
  scrollX: 0,      // accumulated horizontal scroll for bg parallax (never resets)
  scrollY: 0,      // accumulated vertical scroll for bg parallax (never resets)
  target: null,    // 'hook' | 'character' | 'position' | null (manual/animation)
  targetX: 0,      // where camera wants to be
  targetY: 0,
  ease: 16,        // frames to reach target
  width: 1200,     // fixed gameplay viewport width
  height: 640,     // fixed gameplay viewport height
  offsetX: 0,      // horizontal offset to center camera in canvas (set by setupCanvas)
  offsetY: 0       // vertical offset to center camera in canvas (set by setupCanvas)
};

function cameraFollowHook() { camera.target = 'hook'; }
function cameraFollowCharacter() { camera.target = 'character'; }
function cameraPanTo(x, y, ease) {
  camera.target = 'position';
  camera.targetX = x;
  camera.targetY = y;
  camera.ease = ease || 16;
}

// requestAnimationFrame function
function runGame(timestamp) {
  requestAnimationFrame(runGame);

  // Calculate delta time normalized to 60fps (dt=1 at 60fps, dt=0.5 at 120fps)
  if (lastFrameTime === 0) lastFrameTime = timestamp;
  var elapsed = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  if (elapsed > 0 && elapsed < 200) { // cap to avoid huge jumps on tab switch
    dt = elapsed / targetFrameMs;
  } else {
    dt = 1;
  }

  clear(canvas);

  // Apply render scale — all subsequent drawing is in logical coordinates
  canvas.context.save();
  canvas.context.scale(renderScale, renderScale);

  // Camera offset — centers gameplay region within the larger canvas
  var cox = camera.offsetX;
  var coy = camera.offsetY;

  // Fullscreen: background fills entire canvas (stars visible outside camera)
  // Viewport: background clipped to camera region only
  if (renderMode === 'fullscreen') {
    drawBackground();
  }

  // Set up camera region — translate + clip so all game content is confined
  canvas.context.save();
  canvas.context.translate(cox, coy);
  canvas.context.beginPath();
  canvas.context.rect(0, 0, camera.width, camera.height);
  canvas.context.clip();

  if (renderMode === 'viewport') {
    drawBackground();
  }

  switch(gameState) {
    case 'loading':
    //Update
    updateLoading(gameLoading.context);
    // Draw
    canvas.context.drawImage(gameLoading.canvas,0,0);
    break;


    case 'gameIntro':
    updateIntro();
    break;


    case 'menuAnimation':
    // Update
    animateToMenu();
    // Draw
    drawBackgroundClouds(canvas.context,true);
    // Stage 10 first half: draw old game content as-is (no updateGame — prevents clearing)
    if (menuStage === 10 && !menuPanReset) {
      var gpx = camera.x * parallax.gamePanel;
      var gpy = camera.y * parallax.gamePanel;
      // Offset game panel by camera.y so stars follow the vertical sweep
      canvas.context.save();
      canvas.context.translate(0, gpy);
      canvas.context.drawImage(gamePanel.canvas, 0, 0);
      canvas.context.restore();
      drawExitingPlatform(canvas.context);
      canvas.context.save();
      canvas.context.translate(gpx, gpy);
      drawCharacter(canvas.context);
      canvas.context.restore();
    }
    // Draw menu scene (stage 5, stage 10 after cleanup, and later stages)
    if (!(menuStage === 10 && !menuPanReset)) {
      drawPlatformScene(canvas.context, camera.y);
      if (logo.alpha > 0) {
        canvas.context.save();
        canvas.context.globalAlpha = logo.alpha;
        canvas.context.drawImage(logo.canvas, logo.posX, logo.posY + camera.y * parallax.logo);
        canvas.context.restore();
      }
      drawCharacter(canvas.context);
    }
    drawForeground(canvas.context,true);
    // Play button in front of clouds (stage 3 intro)
    if (menuStage === 3 && playButton.alpha > 0) {
      canvas.context.save();
      canvas.context.globalAlpha = playButton.alpha;
      canvas.context.drawImage(playButton.canvas, playButton.posX, playButton.posY);
      canvas.context.restore();
    }
    drawGameOverlay(canvas.context,'fade-out');
    break;


    case 'gameMenu':
    //Update
    updateMenu();
    //Draw
    drawBackgroundClouds(canvas.context,true);
    canvas.context.drawImage(gameMenu.canvas,0,0);
    drawForeground(canvas.context,true);
    // Play button in front of clouds
    renderPlayButton();
    canvas.context.drawImage(playButton.canvas, playButton.posX, playButton.posY);
    break;
    // Note: platform is drawn inside updateMenu via drawPlatformScene


    case 'playGame':
    updateGame();
    updateCamera();
    // update
    drawBackgroundClouds(canvas.context,true);
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    canvas.context.drawImage(gamePanel.canvas,0,0);
    // Platform behind foreground clouds (same z-index as menu)
    drawExitingPlatform(canvas.context);
    drawForeground(canvas.context,true);
    // Character drawn after foreground so it's always in front of parallax
    canvas.context.save();
    canvas.context.translate(gpx, gpy);
    drawCharacter(canvas.context);
    canvas.context.restore();
    // Off-screen star indicator
    drawNextStarIndicator(canvas.context);
    // pause icon
    drawPauseIcon();

    // game over condition
    if (character.centerY-(character.size/2) > camera.height) {
      setupGameOverAnimation();
    }
    break;


    case 'gameRestart':
    //Update
    restartAnimation();
    // Only update game after midpoint swap (new level in place) or during falling
    if (restartGameReset || restartPhase === 'falling') {
      updateGame();
    }
    //draw
    drawBackgroundClouds(canvas.context,true);
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    // Offset game panel by camera.y so stars follow the vertical sweep
    canvas.context.save();
    canvas.context.translate(0, gpy);
    canvas.context.drawImage(gamePanel.canvas,0,0);
    canvas.context.restore();
    // Platform behind foreground clouds (same z-index as menu)
    drawExitingPlatform(canvas.context);
    drawForeground(canvas.context,true);
    // Character drawn after foreground so it's always in front of parallax
    canvas.context.save();
    canvas.context.translate(gpx, gpy);
    drawCharacter(canvas.context);
    canvas.context.restore();
    if (restartPhase !== 'falling') {
      drawGameOverlay(canvas.context,'fade-out');
    }
    break;


    case 'starting':
    updateGame();
    //draw
    drawBackgroundClouds(canvas.context,true);
    // Draw game panel (stars) with fade
    canvas.context.save();
    canvas.context.globalAlpha = hookAlpha;
    canvas.context.drawImage(gamePanel.canvas,0,0);
    canvas.context.restore();
    // Platform behind foreground clouds (same z-index as menu)
    drawStartPlatform();
    drawForeground(canvas.context,true);
    // Character, logo, button outro (in front of clouds)
    updateStart();
    break;


    case 'gameOver':
    camera.vx = 0;
    updateGameOver();
    //draw
    drawBackgroundClouds(canvas.context,true);
    canvas.context.drawImage(gamePanel.canvas,0,0);
    drawExitingPlatform(canvas.context);
    drawForeground(canvas.context,true);
    drawGameOverlay(canvas.context,'fade-in');
    canvas.context.drawImage(gameOver.canvas,0,0);
    break;


    case 'animateGameOver':
    //update
    detach();
    updateGameOverAnimation();
    updateGame();
    // Accumulate horizontal scroll for background parallax (no vertical — bob is cosmetic)
    camera.scrollX += camera.vx * dt;
    //draw
    drawBackgroundClouds(canvas.context,true);
    canvas.context.drawImage(gamePanel.canvas,0,0);
    drawExitingPlatform(canvas.context);
    drawForeground(canvas.context,true);
    drawGameOverlay(canvas.context,'fade-in');
    break;


    case 'gamePaused':
    camera.vx = 0;
    //draw
    drawBackgroundClouds(canvas.context,false);
    canvas.context.drawImage(gamePanel.canvas,0,0);
    drawForeground(canvas.context,false);
    canvas.context.drawImage(pauseCanvas.canvas,0,0);
    break;


    case 'gameResume':
    //draw
    drawBackgroundClouds(canvas.context,false);
    canvas.context.drawImage(gamePanel.canvas,0,0);
    drawForeground(canvas.context,false);
    canvas.context.drawImage(pauseCanvas.canvas,0,0);
    // pause icon
    drawPauseIcon();
    break;

  }

  // UI drawn inside the clipped camera region
  updateInterface();

  // Restore from camera clip
  canvas.context.restore();

  // Camera region border (in canvas-space, outside clip)
  canvas.context.strokeStyle = '#fff';
  canvas.context.lineWidth = 4;
  canvas.context.strokeRect(cox, coy, camera.width, camera.height);

  // Restore render scale
  canvas.context.restore();
}


function updateCamera() {
  var gp = parallax.gamePanel;
  if (camera.target === 'hook' && selectedHook) {
    camera.targetX = (selectedHook.posX - (camera.width/2) + (selectedHook.size/2)) * -1 / gp;
    camera.targetY = 0;
  } else if (camera.target === 'character') {
    camera.targetX = (character.centerX - (camera.width/2) + (character.size/2)) * -1 / gp;
    camera.targetY = 0;
  }
  // 'position' — targetX/targetY already set by cameraPanTo
  // null — manual control, skip follow

  if (camera.target !== null) {
    camera.vx = (camera.targetX - camera.x) / camera.ease;
    camera.vy = (camera.targetY - camera.y) / camera.ease;
    camera.x += camera.vx * dt;
    camera.y += camera.vy * dt;
  }

  // Always accumulate for background parallax (never resets)
  camera.scrollX += camera.vx * dt;
  camera.scrollY += camera.vy * dt;
}
