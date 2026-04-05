function animateStart() {
  gameSetup();
  gameState = 'animateGameStart';
  hookAlpha = 0;

  // character starts on platform
  var hoverY = platform.posY + platform.hover;
  character.centerX = platform.posX + platform.width / 2;
  character.centerY = hoverY + 26 - character.size / 2;

  start.charStartX = character.centerX;
  start.charStartY = character.centerY;
  start.logoStartX = logo.posX;
  start.cameraStartX = 0;
  start.platformStartX = platform.posX;

  // target camera: center first star on screen
  if (starHooks.length > 0) {
    start.targetCameraX = -(starHooks[0].centerX - canvas.width / 2) / parallax.gamePanel;
  } else {
    start.targetCameraX = 0;
  }

  // Calculate parallax factor so platform ends up near left edge (20px margin)
  // Final platform screen X = platformStartX + targetCameraX * parallax = targetScreenX
  var targetScreenX = 160;
  if (start.targetCameraX !== 0) {
    start.platformParallax = (targetScreenX - start.platformStartX) / start.targetCameraX;
  } else {
    start.platformParallax = 0.6;
  }

  // character walk target: right edge of platform
  start.charEdgeX = platform.posX + platform.width - character.size / 2 - 8;

  start.state = 1;
  start.progress = 0;
  start.logoAlpha = 1;
  start.hopVY = 0;
  start.hopping = false;
}

// Draw the sliding-away platform during early gameplay (called from RAF playGame case)
function drawExitingPlatform(context) {
  if (!start.platformExiting) return;

  // Keep hover + campfire animating while visible
  if (platform.hoverDirection === 'up' && platform.hover <= 0) platform.hoverDirection = 'down';
  if (platform.hoverDirection === 'down' && platform.hover >= 5) platform.hoverDirection = 'up';
  if (platform.hoverDirection === 'up') { platform.hover -= 0.024 * dt; }
  else { platform.hover += 0.024 * dt; }
  platform.time += 0.016 * dt;

  var platScreenX = start.platformStartX + camera.x * start.platformParallax;
  // Off screen left — stop drawing permanently
  if (platScreenX + platform.width < -100) {
    start.platformExiting = false;
    return;
  }
  var hoverY = platform.posY + platform.hover;
  drawFloatingRocks(context, hoverY, 0, platScreenX);
  context.drawImage(platform.canvas, platScreenX, hoverY);
  var fireCx = platScreenX + platform.width * 0.3;
  drawCampfireFlames(context, fireCx, hoverY + 32, platform.time, 1.6);
}

var start = {
  state: 1,
  progress: 0,
  logoAlpha: 1,
  logoStartX: 0,
  charStartX: 0,
  charStartY: 0,
  charEdgeX: 0,
  cameraStartX: 0,
  targetCameraX: 0,
  platformStartX: 0,
  platformParallax: 0.6,
  platformExiting: false,
  hopVY: 0,
  hopping: false
}


function updateStart() {

  var context = canvas.context;

  // Tick platform hover + time (drawPlatformScene isn't called during this animation)
  if (platform.hoverDirection === 'up' && platform.hover <= 0) platform.hoverDirection = 'down';
  if (platform.hoverDirection === 'down' && platform.hover >= 5) platform.hoverDirection = 'up';
  if (platform.hoverDirection === 'up') { platform.hover -= 0.024 * dt; }
  else { platform.hover += 0.024 * dt; }
  platform.time += 0.016 * dt;

  //----
  // State 1: Camera pans to center first star. Platform + logo slide left with parallax.
  //          Stars fade in from the right. Character stays on platform.
  if (start.state === 1) {
    start.progress += 0.004 * dt;
    if (start.progress > 1) start.progress = 1;

    // sine ease — slow start, smooth acceleration, gentle stop
    var t = start.progress;
    var ease = (1 - Math.cos(t * Math.PI)) / 2;

    // pan camera toward first star
    var prevCamX = camera.x;
    camera.x = start.cameraStartX + (start.targetCameraX - start.cameraStartX) * ease;
    camera.vx = camera.x - prevCamX;
    camera.scrollX += camera.vx;

    // character stays on platform surface — slides with platform parallax
    var platOffsetX = camera.x * start.platformParallax;
    var hoverY = platform.posY + platform.hover;
    character.centerX = start.charStartX + platOffsetX;
    character.centerY = hoverY + 26 - character.size / 2;

    // fade out logo with parallax
    start.logoAlpha = Math.max(0, 1 - ease * 2);
    if (start.logoAlpha > 0) {
      context.save();
      context.globalAlpha = start.logoAlpha;
      // logo drifts left faster than camera (behind everything)
      var logoX = start.logoStartX + camera.x * 0.3;
      context.drawImage(logo.canvas, logoX, logo.posY);
      context.restore();
    }

    // draw platform with foreground parallax (slides left with character)
    context.drawImage(platform.canvas, start.platformStartX + platOffsetX, hoverY);
    drawFloatingRocks(context, hoverY, 0, start.platformStartX + platOffsetX);
    var fireCx = (start.platformStartX + platOffsetX) + platform.width * 0.3;
    drawCampfireFlames(context, fireCx, hoverY + 32, platform.time, 1.6);

    // draw character on the sliding platform
    drawCharacter(context);

    // fade in stars
    if (start.progress > 0.2 && hookAlpha < 1) {
      hookAlpha += 0.012 * dt;
      if (hookAlpha > 1) hookAlpha = 1;
    }

    if (start.progress >= 1) {
      start.state = 2;
      start.progress = 0;
      hookAlpha = 1;
    }
  }


  //----
  // State 2: Character walks to right edge of platform
  if (start.state === 2) {
    start.progress += 0.02 * dt;
    if (start.progress > 1) start.progress = 1;

    var t = start.progress;
    // easeInOut
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // walk from center to right edge
    var platOffsetX = camera.x * start.platformParallax;
    var walkStartX = start.charStartX + platOffsetX;
    var walkEndX = start.charEdgeX + platOffsetX;
    character.centerX = walkStartX + (walkEndX - walkStartX) * ease;

    var hoverY = platform.posY + platform.hover;
    character.centerY = hoverY + 26 - character.size / 2;

    // keep drawing platform
    context.drawImage(platform.canvas, start.platformStartX + platOffsetX, hoverY);
    drawFloatingRocks(context, hoverY, 0, start.platformStartX + platOffsetX);
    var fireCx = (start.platformStartX + platOffsetX) + platform.width * 0.3;
    drawCampfireFlames(context, fireCx, hoverY + 32, platform.time, 1.6);

    drawCharacter(context);

    if (start.progress >= 1) {
      start.state = 3;
      start.progress = 0;
      start.hopVY = -4;
      start.hopping = true;
      // Save the screen-space X at hop start for drift calculation
      start.hopStartX = character.centerX;
    }
  }


  //----
  // State 3: Character hops off platform, grapples to first star, transitions to gameplay
  if (start.state === 3) {
    if (start.hopping) {
      // Small hop arc (screen coordinates)
      start.hopVY += 0.25 * dt;
      character.centerY += start.hopVY * dt;
      character.centerX += 1.5 * dt;

      // draw platform (still visible)
      var platOffsetX = camera.x * start.platformParallax;
      var hoverY = platform.posY + platform.hover;
      context.drawImage(platform.canvas, start.platformStartX + platOffsetX, hoverY);
      drawFloatingRocks(context, hoverY, 0, start.platformStartX + platOffsetX);
      var fireCx = (start.platformStartX + platOffsetX) + platform.width * 0.3;
      drawCampfireFlames(context, fireCx, hoverY + 32, platform.time, 1.6);

      drawCharacter(context);

      // After hop peaks and starts falling, convert to world coords and start game
      if (start.hopVY > 0.5) {
        start.hopping = false;
        start.platformExiting = true;
        // Convert screen position to world position
        character.centerX = character.centerX - camera.x;
        physics.vx = 1.5;
        physics.vy = start.hopVY;
        startGame();
      }
    }
  }
}
