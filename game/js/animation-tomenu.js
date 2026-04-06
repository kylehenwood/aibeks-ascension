
var menuFirstLoad = true;

function backToMenu() {
  gameState = 'menuAnimation';
  menuAlpha = 0;

  logo.alpha = 0;
  logo.posX = (canvas.width/2)-(logo.width/2) - camera.scrollX * parallax.logo;

  playButton.alpha = 0;

  // set character position
  character.centerY = -100;
  character.centerX = canvas.width/2;
  menuGravity = 0;

  if (menuFirstLoad) {
    // First time — slow pan down from stars to reveal everything
    menuFirstLoad = false;
    camera.target = null;
    camera.y = canvas.height;
    camera.vy = 0;
    gameSetup();
    menuEntryProgress = 0;
    menuStage = 5; // intro pan stage
  } else {
    // Returning from gameplay — pan down like restart, transition into menu
    camera.target = null;
    menuPanProgress = 0;
    menuPanReset = false;
    menuStage = 1;
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

// Platform is drawn by drawPlatformScene in RAF — no split drawing needed

// gameState === 'restartAnimation'
// once complete it starts a new game.
function animateToMenu() {

  // set character to center of the screen;
  character.centerX = canvas.width/2;

  // ::Stage 1 — seamless pan: old level exits up, menu enters from below
  if (menuStage === 1) {
    var duration = 180;
    var panDistance = canvas.height * 2;

    menuPanProgress += (1 / duration) * dt;
    if (menuPanProgress > 1) menuPanProgress = 1;

    // Sine-based speed: slow → fast → slow
    var panSpeed = Math.sin(menuPanProgress * Math.PI) * 18;
    camera.vy = -panSpeed;
    camera.scrollY += camera.vy * dt;

    // Game panel position: fake the transition
    if (menuPanProgress < 0.5) {
      // Old level slides up and out
      var t = menuPanProgress * 2;
      var ease = t * t * t;
      camera.y = -ease * panDistance;
    } else {
      // Menu enters from below
      var t = (menuPanProgress - 0.5) * 2;
      var ease = 1 - (1 - t) * (1 - t) * (1 - t);
      camera.y = (1 - ease) * panDistance;
    }

    // Logo — drawn behind clouds, fades in during second half
    if (menuPanProgress >= 0.5) {
      var logoT = (menuPanProgress - 0.5) * 2; // 0→1 over second half
      var logoFade = Math.min(logoT * 1.5, 1); // fade in quickly once visible
      var context = canvas.context;
      context.save();
      context.globalAlpha = logoFade;
      context.drawImage(logo.canvas, logo.posX + camera.scrollX * parallax.logo, logo.posY + camera.y * 1.1);
      context.restore();
    }

    // Reset at the midpoint
    if (!menuPanReset && menuPanProgress >= 0.45) {
      menuPanReset = true;
      clearVariables();
      gameSetup();
      platform.posX = (canvas.width/2)-(platform.width/2);
      camera.x = 0;
      camera.y = canvas.height * 3;
      return;
    }

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


  // ::Stage 5 — intro: slow pan down from stars to reveal logo, platform + clouds
  if (menuStage === 5) {

    menuEntryProgress += (1 / 240) * dt; // ~4 seconds at 60fps
    if (menuEntryProgress > 1) menuEntryProgress = 1;

    // easeInOutCubic — slow start, smooth middle, gentle stop
    var t = menuEntryProgress;
    var ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

    // Camera pans from +canvas.height to 0 (below → up to reveal platform)
    var prevY = camera.y;
    camera.y = canvas.height * (1 - ease);
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
    context.drawImage(logo.canvas, logo.posX + camera.scrollX * parallax.logo, logo.posY + camera.y * 1.1);
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


  // ::Stage 2 — menu elements rise in from below (after returning from game)
  if (menuStage === 2) {

    menuEntryProgress += (1 / 120) * dt; // ~2 seconds
    if (menuEntryProgress > 1) menuEntryProgress = 1;

    // easeOutCubic for a smooth deceleration
    var t = menuEntryProgress;
    var ease = 1 - (1 - t) * (1 - t) * (1 - t);
    var entryOffset = (1 - ease) * canvas.height;

    // fade in
    if (logo.alpha < 1) {
      logo.alpha += 0.015 * dt;
      if (logo.alpha > 1) logo.alpha = 1;
    }
    if (menuAlpha < 1) {
      menuAlpha += 0.015 * dt;
      if (menuAlpha > 1) menuAlpha = 1;
    }

    // Platform drawn by drawPlatformScene in RAF

    var context = canvas.context;
    context.save();
    context.globalAlpha = Math.min(logo.alpha, 1);
    context.drawImage(logo.canvas, logo.posX + camera.scrollX * parallax.logo, logo.posY + entryOffset * 0.6);
    context.restore();

    if (menuEntryProgress >= 1) {
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
    context.drawImage(logo.canvas, logo.posX + camera.scrollX * parallax.logo, logo.posY);

    // Landed on platform
    if (character.centerY >= landingY) {
      character.centerY = landingY;
      charFallVY = 0;
      menuStage = 3;
    }
  }


  // ::Stage 3 — show play button, transition to menu state
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
    context.drawImage(logo.canvas, logo.posX + camera.scrollX * parallax.logo, logo.posY);

    if (playButton.alpha >= 1 && playButton.progress >= 100) {
      setPlayButton();
      menuStage = 0;
      logo.alpha = 0;
      gameState = "gameMenu";
    }
  }
}
