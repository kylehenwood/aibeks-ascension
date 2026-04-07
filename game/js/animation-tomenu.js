
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
    // First time — menu scene at standard positions, camera starts below, pans up
    menuFirstLoad = false;
    camera.target = null;
    camera.vy = 0;
    gameSetup();

    // Standard menu positions
    platform.posX = (camera.width / 2) - (platform.width / 2);
    platform.posY = (camera.height / 2) - (platform.height / 2) + 120;
    logo.posX = (camera.width/2)-(logo.width/2);
    logo.posY = (camera.height / 2) - (logo.height / 2) - 120;
    logo.alpha = 0;
    menuAlpha = 0;

    // Camera starts below so all elements are off-screen above
    camera.y = camera.height;
    menuEntryProgress = 0;
    menuStage = 5; // intro pan stage
  } else {
    // Returning from gameplay — two-phase pan:
    // Phase 1 (stage 10): pan down to push old content off-screen
    // Phase 2 (stage 11): create new menu scene, pan up to reveal it
    camera.target = null;
    detach();

    // Snap camera.x to 0 for a purely vertical pan
    camera.x = 0;
    camera.vx = 0;

    menuCamYStart = camera.y;
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

  // ::Stage 10 — back to menu: pan down past old content, then up to new menu
  //
  // Phase 1: camera.y goes negative — old content scrolls up and off-screen.
  // At midpoint: clean up, reset menu elements to standard positions,
  //              set camera.y to +camera.height (below the menu scene).
  // Phase 2: camera.y pans from +camera.height to 0 — menu enters from above.
  // Parallax handles all element positioning naturally.
  if (menuStage === 10) {
    var totalDuration = 240; // ~4 seconds total at 60fps
    menuPanProgress += (1 / totalDuration) * dt;
    if (menuPanProgress > 1) menuPanProgress = 1;

    var ease = (1 - Math.cos(menuPanProgress * Math.PI)) / 2;
    var prevCamY = camera.y;

    if (!menuPanReset) {
      // Phase 1: pan down — old content exits upward
      var panDown = camera.height * 1.5;
      camera.y = menuCamYStart - ease * 2 * panDown; // ease 0→0.5 maps to full panDown
    } else {
      // Phase 2: pan up from below to reveal menu scene
      var t2 = (ease - 0.5) * 2; // 0→1 over second half
      camera.y = camera.height * (1 - t2);
    }

    camera.vy = camera.y - prevCamY;
    camera.scrollY += camera.vy;

    // Midpoint: old content gone — set up new menu scene
    if (!menuPanReset && menuPanProgress >= 0.5) {
      menuPanReset = true;

      var savedScrollX = camera.scrollX;
      var savedScrollY = camera.scrollY;
      clearVariables();
      camera.scrollX = savedScrollX;
      camera.scrollY = savedScrollY;
      gamePanel.context.clearRect(0, 0, gamePanel.canvas.width, gamePanel.canvas.height);

      // Standard menu positions
      platform.posX = (camera.width / 2) - (platform.width / 2);
      platform.posY = (camera.height / 2) - (platform.height / 2) + 120;
      logo.posX = (camera.width/2)-(logo.width/2);
      logo.posY = (camera.height / 2) - (logo.height / 2) - 120;
      logo.alpha = 0;
      menuAlpha = 0;

      // Camera below the scene — will pan up
      camera.y = camera.height;

      // Hide character until pan completes
      character.centerX = -9999;
      character.centerY = -9999;
    }

    // Fade in logo during phase 2
    if (menuPanReset) {
      var fadeProgress = (menuPanProgress - 0.5) * 2;
      logo.alpha = Math.min(fadeProgress * 1.5, 1);
      menuAlpha = logo.alpha;
    }

    // Pan complete
    if (menuPanProgress >= 1) {
      camera.y = 0;
      camera.vy = 0;
      logo.alpha = 1;
      menuAlpha = 1;

      // Character falls from sky onto platform
      character.centerX = platform.posX + platform.width / 2;
      character.centerY = -character.size;
      charFallVY = 0;
      menuStage = 6;
    }
  }


  // ::Stage 5 — intro: camera pans up from below to reveal menu scene
  // Elements are at standard world positions. camera.y starts at +camera.height
  // and pans to 0. Parallax naturally reveals everything at different rates.
  if (menuStage === 5) {

    menuEntryProgress += (1 / 240) * dt; // ~4 seconds at 60fps
    if (menuEntryProgress > 1) menuEntryProgress = 1;

    // easeInOutCubic — slow start, smooth middle, gentle stop
    var t = menuEntryProgress;
    var ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

    // Camera pans from +camera.height to 0
    var prevY = camera.y;
    camera.y = camera.height * (1 - ease);
    camera.vy = camera.y - prevY;
    camera.scrollY += camera.vy;

    // Fade in logo
    logo.alpha = Math.min(ease * 1.5, 1);
    menuAlpha = logo.alpha;

    // Position character on platform (follows platform parallax)
    var platScreenY = platform.posY + platform.hover + camera.y * parallax.platform;
    character.centerX = platform.posX + platform.width / 2;
    character.centerY = platScreenY + 26 - character.size / 2;

    if (menuEntryProgress >= 1) {
      camera.y = 0;
      camera.vy = 0;
      logo.alpha = 1;
      menuAlpha = 1;
      character.centerX = platform.posX + platform.width / 2;
      character.centerY = platform.posY + 26 - character.size / 2;
      menuStage = 3;
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
    context.drawImage(logo.canvas, logo.posX, logo.posY);

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
    context.drawImage(logo.canvas, logo.posX, logo.posY);

    if (playButton.alpha >= 1 && playButton.progress >= 100) {
      setPlayButton();
      menuStage = 0;
      logo.alpha = 0;
      gameState = "gameMenu";
    }
  }
}
