
var menuFirstLoad = true;

var menuCamYStart = 0;
var menuPanTargetY = 0;

function backToMenu() {
  gameState = 'menuAnimation';
  menuAlpha = 0;

  logo.alpha = 0;
  logo.posX = (camera.width/2)-(logo.width/2);

  playButton.alpha = 0;
  menuGravity = 0;

  // Clean up exiting platform from gameplay (surface + draw flag)
  if (start.platformExiting) {
    start.platformExiting = false;
    if (start.platformSurface) {
      removeSurface(start.platformSurface);
      start.platformSurface = null;
    }
  }

  if (menuFirstLoad) {
    // First time — slow pan down from stars to reveal everything
    menuFirstLoad = false;
    camera.target = null;
    camera.y = camera.height;
    camera.vy = 0;
    gameSetup();
    menuEntryProgress = 0;
    menuStage = 5; // intro pan stage
  } else {
    // Returning from gameplay — pan camera straight down to a new platform
    camera.target = null;
    detach();

    // Snap camera.x to 0 so the pan is purely vertical
    camera.x = 0;
    camera.vx = 0;

    // Place platform centered on screen, far below in world Y.
    // Camera pans down (negative camera.y) to reveal it.
    platform.posX = (camera.width / 2) - (platform.width / 2);
    var menuPosY = (camera.height / 2) - (platform.height / 2) + 120;
    var panDist = camera.height * 1.2;
    platform.posY = menuPosY + panDist; // off-screen below at camera.y = 0

    menuCamYStart = camera.y;
    menuPanTargetY = -panDist;
    menuPanProgress = 0;
    menuPanReset = false;
    menuStage = 10;
  }
}

// end game
var menuStage = 1;
var menuAlpha = 0;
var menuGravity = 0;
var menuPanProgress = 0;
var menuPanReset = false;
var menuEntryOffset = 0;
var menuEntryProgress = 0;
var charFallVY = 0;

// gameState === 'menuAnimation'
// once complete it transitions to gameMenu state.
function animateToMenu() {

  // ::Stage 10 — pan camera down to new platform (returning from gameplay)
  //
  // Platform is placed far below the screen. Camera pans down (camera.y goes
  // negative) so old game content scrolls up and off-screen while the platform
  // rises into view from below. No midpoint swap — one continuous motion.
  if (menuStage === 10) {
    menuPanProgress += (1 / 180) * dt; // ~3 seconds at 60fps
    if (menuPanProgress > 1) menuPanProgress = 1;

    // Sine ease: slow → fast → slow
    var ease = (1 - Math.cos(menuPanProgress * Math.PI)) / 2;

    var prevCamY = camera.y;

    // Pan camera.y straight down to bring platform into view
    camera.y = menuCamYStart + (menuPanTargetY - menuCamYStart) * ease;

    camera.vy = camera.y - prevCamY;
    camera.scrollY += camera.vy;

    // Clean up old game data once it has scrolled off-screen
    if (!menuPanReset && menuPanProgress >= 0.4) {
      menuPanReset = true;
      var savedScrollX = camera.scrollX;
      var savedScrollY = camera.scrollY;
      clearVariables();
      camera.scrollX = savedScrollX;
      camera.scrollY = savedScrollY;
      // Hide character until pan completes
      character.centerX = -9999;
      character.centerY = -9999;
    }

    // Logo fades in during second half
    if (menuPanProgress > 0.5) {
      var fadeProgress = (menuPanProgress - 0.5) * 2;
      logo.alpha = Math.min(fadeProgress * 1.5, 1);
      menuAlpha = logo.alpha;

      var context = canvas.context;
      context.save();
      context.globalAlpha = logo.alpha;
      context.drawImage(logo.canvas, logo.posX, logo.posY + camera.y);
      context.restore();
    }

    // Pan complete — snap to final menu positions
    if (menuPanProgress >= 1) {
      platform.posY = (camera.height / 2) - (platform.height / 2) + 120;
      camera.y = 0;
      camera.vy = 0;
      logo.alpha = 1;
      menuAlpha = 1;

      // Character spawns above camera, will fall onto platform
      character.centerX = platform.posX + platform.width / 2;
      character.centerY = -character.size;
      charFallVY = 0;
      menuStage = 6;
    }
  }


  // ::Stage 5 — intro: slow pan down from stars to reveal logo, platform + clouds
  if (menuStage === 5) {

    menuEntryProgress += (1 / 240) * dt; // ~4 seconds at 60fps
    if (menuEntryProgress > 1) menuEntryProgress = 1;

    // easeInOutCubic — slow start, smooth middle, gentle stop
    var t = menuEntryProgress;
    var ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

    // Camera pans from +camera.height to 0 (below → up to reveal platform)
    var prevY = camera.y;
    camera.y = camera.height * (1 - ease);
    camera.vy = camera.y - prevY;
    camera.scrollY += camera.vy;

    // Fade in elements as they come into view (start fading at 30%)
    var fadeT = Math.max(0, (menuEntryProgress - 0.3) / 0.7);
    logo.alpha = Math.min(fadeT * 1.5, 1);
    menuAlpha = Math.min(fadeT * 1.5, 1);

    var context = canvas.context;

    // Title — farthest back (behind clouds)
    context.save();
    context.globalAlpha = logo.alpha;
    context.drawImage(logo.canvas, logo.posX + camera.x * parallax.logo, logo.posY + camera.y * 1.1);
    context.restore();

    // Platform drawn by drawPlatformScene in RAF with camera.y parallax

    if (menuEntryProgress >= 1) {
      camera.y = 0;
      camera.vy = 0;
      // Character falls from sky onto platform
      character.centerX = platform.posX + platform.width / 2;
      character.centerY = -character.size;
      charFallVY = 0;
      menuStage = 6;
    }
  }


  // ::Stage 6 — character falls from sky onto platform
  if (menuStage === 6) {
    var landingY = platform.posY + 26 - character.size / 2;

    // Apply gravity
    charFallVY += 0.4 * dt;
    character.centerY += charFallVY * dt;

    // Platform drawn by drawPlatformScene in RAF
    var context = canvas.context;
    context.drawImage(logo.canvas, logo.posX + camera.x * parallax.logo, logo.posY);

    // Landed on platform
    if (character.centerY >= landingY) {
      character.centerY = landingY;
      charFallVY = 0;
      menuStage = 3;
    }
  }


  // ::Stage 3 — show play button on landing, transition to menu state
  if (menuStage === 3) {
    if (playButton.progress < 100) {
      updatePlayButton();
    }
    if (playButton.alpha < 1) {
      playButton.alpha += 0.1;
    } else {
      playButton.alpha = 1;
    }

    // Position character on platform (must match updateMenu position)
    character.centerX = platform.posX + platform.width / 2;
    character.centerY = platform.posY + 26 - character.size / 2;

    // Platform drawn by drawPlatformScene in RAF
    var context = canvas.context;
    context.drawImage(playButton.canvas,playButton.posX,playButton.posY);
    context.drawImage(logo.canvas, logo.posX + camera.x * parallax.logo, logo.posY);

    if (playButton.alpha >= 1 && playButton.progress >= 100) {
      setPlayButton();
      menuStage = 0;
      logo.alpha = 0;
      gameState = "gameMenu";
    }
  }
}
