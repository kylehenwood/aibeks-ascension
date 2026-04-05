var restartProgress = 0;
var restartGameReset = false;
var restartPanSpeed = 0;
var restartFalling = false;

function restartGame() {
  gameState = "gameRestart";
  restartProgress = 0;
  restartGameReset = false;
  restartFalling = false;
  start.platformExiting = false; // don't redraw platform after restart
  camera.target = null;
  detach();
}

// One-way pan DOWN: slow → fast → slow (sine-based velocity)
//
// Background: camera.vy drives camera.scrollY which accumulates continuously.
//             Stars scroll down smoothly the whole time.
//
// Game panel + clouds: camera.y fakes the transition.
//   First half:  camera.y goes negative (old level exits upward)
//   Midpoint:    game resets (hidden by peak speed)
//   Second half: camera.y goes from positive back to 0 (new level enters from below)
//
// Character falls in from above once camera settles.

function restartAnimation() {
  var duration = 180; // ~3 seconds at 60fps
  var panDistance = canvas.height * 2; // total distance each half covers

  restartProgress += (1 / duration) * dt;
  if (restartProgress > 1) restartProgress = 1;

  // Sine-based speed: slow → fast → slow (one direction)
  // sin(progress * π) peaks at 0.5, giving smooth acceleration/deceleration
  restartPanSpeed = Math.sin(restartProgress * Math.PI) * 18;

  // Drive background scroll — accumulate directly since updateCamera() isn't called
  camera.vy = -restartPanSpeed;
  camera.scrollY += camera.vy * dt;

  // Game panel position: fake the level swap
  if (restartProgress < 0.5) {
    // First half: old level slides up and out
    // Map 0→0.5 progress to 0→1 using easeInCubic for smooth exit
    var t = restartProgress * 2;
    var ease = t * t * t;
    camera.y = -ease * panDistance;
  } else {
    // Second half: new level enters from below
    // Map 0.5→1 progress to 1→0 using easeOutCubic for smooth arrival
    var t = (restartProgress - 0.5) * 2;
    var ease = 1 - (1 - t) * (1 - t) * (1 - t);
    camera.y = (1 - ease) * panDistance;
  }

  // Reset the game just before the midpoint while old level is still off screen
  // This ensures the new level is ready before the second half starts drawing it
  if (!restartGameReset && restartProgress >= 0.45) {
    restartGameReset = true;
    clearVariables();
    gameSetup();
    var firstStar = starHooks[0];
    camera.x = -(firstStar.centerX - canvas.width / 2);
    camera.vx = 0;
    // Hide character off-screen until falling phase
    character.centerX = -9999;
    character.centerY = -9999;
    // Push new level off screen below so it's not visible on this frame
    camera.y = canvas.height * 3;
    return;
  }

  // Pan complete — start character falling in
  if (restartProgress >= 1 && !restartFalling) {
    restartFalling = true;
    camera.vx = 0;
    camera.vy = 0;
    camera.y = 0;

    // Position character 240px left of first star, above screen
    character.centerX = starHooks[0].centerX - 240;
    character.centerY = -character.size;
    physics.vx = 0;
    physics.vy = 0;
  }

  // Character falling phase — apply gravity and wait for horizontal alignment
  if (restartFalling) {
    physics.vy += physics.GRAVITY * dt;
    if (physics.vy > physics.TERMINAL_VELOCITY) {
      physics.vy = physics.TERMINAL_VELOCITY;
    }
    character.centerY += physics.vy * dt;

    // When character reaches the star's Y level, grapple
    if (character.centerY >= starHooks[0].centerY) {
      restartFalling = false;
      gameState = "playGame";
      hookAlpha = 1;
      infiniteGen.startX = starHooks[0].centerX;
      infiniteGen.maxDistance = 0;
      cameraFollowHook();
      changeHook(0);
    }
  }
}
