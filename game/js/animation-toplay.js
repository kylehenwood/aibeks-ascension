function animateStart() {
  playButton.hover = false;
  playButton.pressed = false;
  canvas.id.style.cursor = '';

  // Camera at menu position, generate level with first star to the right of platform
  camera.x = 0;
  var firstStarTarget = platform.posX + platform.width + 480;
  gameSetup(firstStarTarget);

  gameState = 'starting';
  hookAlpha = 0;

  // character starts on platform (menu position — center of screen)
  var hoverY = platform.posY + platform.hover;
  character.centerX = platform.posX + platform.width / 2;
  character.centerY = hoverY + 26 - character.size / 2;

  logo.posX = (camera.width / 2) - (logo.width / 2);
  start.logoStartX = logo.posX;
  start.platformStartX = platform.posX;

  // Camera: starts on platform (0), pans to center first star
  start.cameraStartX = 0;
  start.targetCameraX = -(starHooks[0].centerX - camera.width / 2);

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

  var exitParallax = start.platformParallax;

  // Register collision surface when platform starts exiting
  if (!start.platformSurface) {
    start.platformSurface = addSurface({
      x: start.platformStartX,
      y: platform.posY + platform.hover + 26,
      width: platform.width,
      height: 10,
      parallax: exitParallax,
      topOnly: true,
      tag: 'platform'
    });
  }

  // Update surface position each frame (hover bobs)
  start.platformSurface.x = start.platformStartX;
  start.platformSurface.y = platform.posY + platform.hover + 26;

  var platScreenX = start.platformStartX + camera.x * exitParallax;
  var platScreenY = platform.posY + platform.hover + camera.y * exitParallax;
  // Off screen — stop drawing and remove collision surface
  if (platScreenX + platform.width < -100 || platScreenY > camera.height + 200 || platScreenY + platform.height < -200) {
    start.platformExiting = false;
    removeSurface(start.platformSurface);
    start.platformSurface = null;
    return;
  }
  context.drawImage(platform.canvas, platScreenX, platScreenY);
  var fireCx = platScreenX + platform.width * 0.3;
  drawCampfireFlames(context, fireCx, platScreenY + 32, platform.time, 1.6);
  drawFloatingRocks(context, platScreenY, 0, platScreenX);
}

var start = {
  state: 1,
  progress: 0,
  logoAlpha: 1,
  logoStartX: 0,
  cameraStartX: 0,
  targetCameraX: 0,
  platformStartX: 0,
  platformParallax: 0.6,
  platformExiting: false,
  platformSurface: null,
  hopVY: 0,
  hopping: false
}


// Draw the platform layer during starting animation (called BEFORE foreground clouds)
function drawStartPlatform() {
  var context = canvas.context;
  var platScreenX = start.platformStartX + camera.x * start.platformParallax;
  var hoverY = platform.posY + platform.hover;

  context.drawImage(platform.canvas, platScreenX, hoverY);
  var fireCx = platScreenX + platform.width * 0.3;
  drawCampfireFlames(context, fireCx, hoverY + 32, platform.time, 1.6);
  drawFloatingRocks(context, hoverY, 0, platScreenX);
}

// Update logic + draw overlays during starting animation (called AFTER foreground clouds)
function updateStart() {

  var context = canvas.context;

  // Tick platform hover + time (drawPlatformScene isn't called during this animation)
  if (platform.hoverDirection === 'up' && platform.hover <= 0) platform.hoverDirection = 'down';
  if (platform.hoverDirection === 'down' && platform.hover >= 5) platform.hoverDirection = 'up';
  if (platform.hoverDirection === 'up') { platform.hover -= 0.024 * dt; }
  else { platform.hover += 0.024 * dt; }
  platform.time += 0.016 * dt;

  //----
  // State 1: Camera pans from platform (menu) to center first star.
  //          Stars fade in. Platform stays in place. Logo fades out.
  if (start.state === 1) {
    start.progress += 0.004 * dt;
    if (start.progress > 1) start.progress = 1;

    // easeInOutCubic — gentle start, smooth middle, soft stop
    var t = start.progress;
    var ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

    // pan camera from platform toward first star
    var prevCamX = camera.x;
    camera.x = start.cameraStartX + (start.targetCameraX - start.cameraStartX) * ease;
    camera.vx = camera.x - prevCamX;
    camera.scrollX += camera.vx;

    // Platform world position + camera offset
    var platScreenX = start.platformStartX + camera.x * start.platformParallax;
    var hoverY = platform.posY + platform.hover;

    // Character stays on platform surface
    character.centerX = platScreenX + platform.width / 2;
    character.centerY = hoverY + 26 - character.size / 2;

    // Fade out logo + button glow — drifts slightly less than camera (background feel)
    start.logoAlpha = 1 - ease;
    playButton.alpha = 1 - ease;
    if (start.logoAlpha > 0) {
      context.save();
      context.globalAlpha = start.logoAlpha;
      var logoX = start.logoStartX + camera.x * parallax.logo;
      context.drawImage(logo.canvas, logoX, logo.posY);
      context.restore();
    }

    // Play button outro — line shrinks to center, text fades out
    drawPlayButtonOutro(context, ease);

    // Draw character on the platform (platform drawn separately by drawStartPlatform)
    drawCharacter(context);

    // Stars fade in as camera pans toward them
    hookAlpha = ease;

    if (start.progress >= 1) {
      start.state = 2;
      start.progress = 0;
      hookAlpha = 1;
    }
  }


  //----
  // State 2: Character walks to right edge of platform
  else if (start.state === 2) {
    start.progress += 0.02 * dt;
    if (start.progress > 1) start.progress = 1;

    var t = start.progress;
    // easeInOut
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Platform world position + camera offset
    var platScreenX = start.platformStartX + camera.x * start.platformParallax;
    var walkStartX = platScreenX + platform.width / 2;
    var walkEndX = platScreenX + platform.width - character.size / 2 - 8;
    character.centerX = walkStartX + (walkEndX - walkStartX) * ease;

    var hoverY = platform.posY + platform.hover;
    character.centerY = hoverY + 26 - character.size / 2;

    // Character drawn after foreground (platform drawn separately by drawStartPlatform)
    drawCharacter(context);

    if (start.progress >= 1) {
      start.state = 3;
      start.progress = 0;
      start.hopVY = -4;
      start.hopping = true;
      start.hopStartX = character.centerX;
    }
  }


  //----
  // State 3: Character hops off platform, grapples to first star, transitions to gameplay
  else if (start.state === 3) {
    if (start.hopping) {
      // Small hop arc (screen coordinates)
      start.hopVY += 0.25 * dt;
      character.centerY += start.hopVY * dt;
      character.centerX += 1.5 * dt;

      // Platform drawn separately by drawStartPlatform
      drawCharacter(context);

      // After hop peaks and starts falling, switch to gameplay
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
