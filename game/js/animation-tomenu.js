
var menuFirstLoad = true;

var menuCamYStart = 0;
var menuPanTargetY = 0;
var menuPhase2StartY = 0;

function backToMenu() {
  gameState = 'menuAnimation';
  menuAlpha = 0;

  logo.alpha = 0;
  playButton.alpha = 0;
  menuGravity = 0;

  if (menuFirstLoad) {
    // First time — menu scene at standard positions, camera starts below, pans up
    menuFirstLoad = false;
    camera.target = null;
    camera.vy = 0;
    gameSetup();

    // Standard menu positions (where things settle at camera.y = 0)
    platform.posX = (camera.width / 2) - (platform.width / 2);
    platform.posY = (camera.height / 2) - (platform.height / 2) + 120;
    logo.posX = (camera.width/2)-(logo.width/2);
    logo.posY = (camera.height / 2) - (logo.height / 2) - 120;
    logo.alpha = 0;
    menuAlpha = 0;

    // Calculate camera.y start so ALL elements are off-screen below.
    // Screen Y = worldY + camera.y * parallax. To be below screen:
    //   worldY + startY * parallax > camera.height
    // Logo has the smallest parallax (0.3) so it's the bottleneck.
    var introStartY = Math.ceil((camera.height - logo.posY + 100) / parallax.logo);
    camera.y = introStartY;
    menuCamYStart = introStartY;
    menuEntryProgress = 0;
    menuStage = 5; // intro pan stage
  } else {
    // Returning from gameplay — single sine-curve sweep.
    // Old scene stays alive during phase 1 (stars, platform, character visible).
    // Everything cleaned up at midpoint when off-screen.
    camera.target = null;

    // Position character at horizontal center, well below camera
    character.centerX = -camera.x + camera.width / 2;
    character.centerY = camera.height + 1200;

    // Pre-calculate the clearance needed to push all menu elements off-screen.
    // Logo (parallax 0.3) is the bottleneck — needs the most camera.y to hide.
    var logoStdY = (camera.height / 2) - (logo.height / 2) - 120;
    menuPhase2StartY = Math.ceil((camera.height - logoStdY + 100) / parallax.logo);

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

  // ::Stage 10 — back to menu: single sine-curve sweep (mirrors restart)
  //
  // Same structure as restartAnimation: single sine curve, swap at midpoint.
  // Phase 1: old content exits upward.
  // Phase 2: new menu scene enters from below via parallax.
  if (menuStage === 10) {
    var clearance = menuPhase2StartY;
    var totalDistance = clearance * 2;

    menuPanProgress += (1 / 240) * dt; // ~4 seconds — gentle transition
    if (menuPanProgress > 1) menuPanProgress = 1;

    // easeInOutCubic — gentle start, smooth middle, soft landing
    var t = menuPanProgress;
    var ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
    var prevCamY = camera.y;

    if (!menuPanReset) {
      // First half: pan down from start, old content exits up
      camera.y = menuCamYStart - ease * totalDistance;
    } else {
      // Second half: pan from +clearance down to 0
      var t = (ease - 0.5) * 2; // 0→1 over second half
      camera.y = clearance * (1 - t);
    }

    camera.vy = camera.y - prevCamY;
    camera.scrollX += camera.vx * dt;
    camera.scrollY += camera.vy;

    // Character floats through the transition with a sine wave (+400 to -400 from center)
    var charScreenY = 560 + Math.sin(menuPanProgress * Math.PI * 2 + Math.PI / 2) * 640;
    if (charScreenY < -character.size) {
      // Once above the camera, remove from view for the rest of the transition
      character.centerX = -9999;
      character.centerY = -9999;
    } else if (character.centerX !== -9999) {
      character.centerX = -camera.x + camera.width / 2;
      character.centerY = charScreenY - camera.y;
    }

    // Swap at midpoint — old content off-screen, set up new menu scene
    if (!menuPanReset && menuPanProgress >= 0.5) {
      menuPanReset = true;

      // Now everything is off-screen — detach rope and clean up
      detach();
      if (start.platformExiting) {
        start.platformExiting = false;
        if (start.platformSurface) {
          removeSurface(start.platformSurface);
          start.platformSurface = null;
        }
      }

      var savedScrollX = camera.scrollX;
      var savedScrollY = camera.scrollY;
      clearVariables();
      camera.scrollX = savedScrollX;
      camera.scrollY = savedScrollY;
      gamePanel.context.clearRect(0, 0, gamePanel.canvas.width, gamePanel.canvas.height);

      // Reset camera.x for menu (everything was just cleaned up)
      camera.x = 0;
      camera.vx = 0;

      // Standard menu positions
      platform.posX = (camera.width / 2) - (platform.width / 2);
      platform.posY = (camera.height / 2) - (platform.height / 2) + 120;
      logo.posX = (camera.width/2)-(logo.width/2);
      logo.posY = (camera.height / 2) - (logo.height / 2) - 120;
      logo.alpha = 0;
      menuAlpha = 0;

      // Camera below so all elements are off-screen below
      camera.y = clearance;

      // Hide character until pan completes
      character.centerX = -9999;
      character.centerY = -9999;
      return;
    }

    // Fade in logo during second half
    if (menuPanReset) {
      var fadeProgress = (menuPanProgress - 0.5) * 2;
      logo.alpha = Math.min(fadeProgress * 1.5, 1);
      menuAlpha = logo.alpha;
    }

    // Sweep complete
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


  // ::Stage 5 — intro: camera pans from below to reveal menu scene
  // Elements at standard world positions. camera.y starts large positive
  // (everything off-screen below) and pans to 0. Parallax reveals naturally.
  if (menuStage === 5) {

    menuEntryProgress += (1 / 240) * dt; // ~4 seconds at 60fps
    if (menuEntryProgress > 1) menuEntryProgress = 1;

    // easeInOutCubic — slow start, smooth middle, gentle stop
    var t = menuEntryProgress;
    var ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

    // Camera pans from menuCamYStart to 0
    var prevY = camera.y;
    camera.y = menuCamYStart * (1 - ease);
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
      character.centerY = platform.posY + platform.hover + 26 - character.size / 2;
      menuStage = 3;
    }
  }


  // ::Stage 6 — character falls from sky onto platform
  if (menuStage === 6) {
    var landingY = platform.posY + platform.hover + 26 - character.size / 2;

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

    // Position character on platform (hover already ticked by drawPlatformScene in RAF)
    character.centerX = platform.posX + platform.width / 2;
    character.centerY = platform.posY + platform.hover + 26 - character.size / 2;

    // Logo drawn behind clouds; play button drawn after drawForeground in RAF
    var context = canvas.context;
    context.drawImage(logo.canvas, logo.posX, logo.posY);

    if (playButton.alpha >= 1 && playButton.progress >= 100) {
      playButton.progress = 100;
      playButton.alpha = 1;
      renderPlayButton();
      menuStage = 0;
      logo.alpha = 0;
      gameState = "gameMenu";
    }
  }
}
