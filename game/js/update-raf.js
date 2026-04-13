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
  height: 640      // fixed gameplay viewport height
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
    drawBackground();
    // Stage 10 first half: draw old game content as-is (no updateGame — prevents clearing)
    if (menuStage === 10 && !menuPanReset) {
      var gpx = camera.x * parallax.gamePanel;
      var gpy = camera.y * parallax.gamePanel;
      canvas.context.drawImage(gamePanel.canvas, gpx, gpy);
      canvas.context.drawImage(clickAreas.canvas, gpx, gpy);
      canvas.context.save();
      canvas.context.translate(gpx, gpy);
      drawCharacter(canvas.context);
      canvas.context.restore();
    }
    drawForeground(canvas.context,true);
    // Stage 10 first half: draw exiting platform in front of clouds (matches playGame order)
    if (menuStage === 10 && !menuPanReset) {
      drawExitingPlatform(canvas.context);
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
    drawBackground();
    drawForeground(canvas.context,true);
    canvas.context.drawImage(gameMenu.canvas,0,0);
    break;
    // Note: platform is drawn inside updateMenu via drawPlatformScene


    case 'playGame':
    updateGame();
    updateCamera();
    // update
    drawBackground();
    drawCharacter(gamePanel.context);
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    canvas.context.drawImage(gamePanel.canvas,gpx,gpy);
    canvas.context.drawImage(clickAreas.canvas,gpx,gpy);
    drawForeground(canvas.context,true);
    // Platform slides off left after game starts
    drawExitingPlatform(canvas.context);
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
    drawBackground();
    drawCharacter(gamePanel.context);
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    canvas.context.drawImage(gamePanel.canvas,gpx,gpy);
    canvas.context.drawImage(clickAreas.canvas,gpx,gpy);
    drawForeground(canvas.context,true);
    drawExitingPlatform(canvas.context);
    if (restartPhase !== 'falling') {
      drawGameOverlay(canvas.context,'fade-out');
    }
    break;


    case 'starting':
    updateGame();
    //draw
    drawBackground();
    // Draw game panel (stars) with fade
    canvas.context.save();
    canvas.context.globalAlpha = hookAlpha;
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    canvas.context.drawImage(gamePanel.canvas,gpx,gpy);
    canvas.context.drawImage(clickAreas.canvas,gpx,gpy);
    canvas.context.restore();
    drawForeground(canvas.context,true);
    // Draw platform, character, logo (on top of everything)
    updateStart();
    break;


    case 'gameOver':
    camera.vx = 0;
    //draw
    drawBackground();
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    canvas.context.drawImage(gamePanel.canvas,gpx,gpy);
    canvas.context.drawImage(clickAreas.canvas,gpx,gpy);
    drawForeground(canvas.context,true);
    drawExitingPlatform(canvas.context);
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
    drawBackground();
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    canvas.context.drawImage(gamePanel.canvas,gpx,gpy);
    canvas.context.drawImage(clickAreas.canvas,gpx,gpy);
    drawForeground(canvas.context,true);
    drawExitingPlatform(canvas.context);
    drawGameOverlay(canvas.context,'fade-in');
    drawCharacter(canvas.context);
    break;


    case 'gamePaused':
    camera.vx = 0;
    //draw
    drawBackground();
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    canvas.context.drawImage(gamePanel.canvas,gpx,gpy);
    canvas.context.drawImage(clickAreas.canvas,gpx,gpy);
    drawForeground(canvas.context,false);
    canvas.context.drawImage(pauseCanvas.canvas,0,0);
    break;


    case 'gameResume':
    //draw
    drawBackground();
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    canvas.context.drawImage(gamePanel.canvas,gpx,gpy);
    canvas.context.drawImage(clickAreas.canvas,gpx,gpy);
    drawForeground(canvas.context,false);
    canvas.context.drawImage(pauseCanvas.canvas,0,0);
    // pause icon
    drawPauseIcon();
    break;

  }

  //console.log(starCameraY);
  //console.log(cameraY);
  //console.log('-----');
  // paint UI
  updateInterface();
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
