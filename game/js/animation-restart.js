var restartProgress = 0;
var restartPhase = 'idle'; // 'panning' | 'falling' | 'idle'
var restartGameReset = false;
var restartCamYStart = 0;
var restartDuration = 180; // frames (~3s at 60fps) — adjustable via debug panel

function restartGame() {
  gameState = "gameRestart";
  restartProgress = 0;
  restartPhase = 'panning';
  restartGameReset = false;
  restartCamYStart = camera.y;
  camera.target = null;
  detach();

  // Position character at horizontal center, well below camera
  character.centerX = -camera.x + camera.width / 2;
  character.centerY = camera.height + 1200;
}

// Restart animation — single continuous sweep:
//
// Camera pans down using a sine curve (slow → fast → slow).
// Old content exits upward. At the midpoint (peak speed, content off screen),
// the level is swapped and camera.y is repositioned so the sweep continues
// seamlessly — new content enters from below and settles at camera.y = 0.

function restartAnimation() {
  var clearance = camera.height * 1.5;
  var totalDistance = clearance * 2; // full sweep: clearance down + clearance back up

  restartProgress += (1 / restartDuration) * dt;
  if (restartProgress > 1) restartProgress = 1;

  if (restartPhase === 'panning') {
    // Single sine curve: slow → fast at midpoint → slow
    // sin(progress * PI) gives 0→1→0 speed profile
    // Integrated: (1 - cos(progress * PI)) / 2 gives 0→1 position with sine easing
    var ease = (1 - Math.cos(restartProgress * Math.PI)) / 2;

    var prevCamY = camera.y;

    if (!restartGameReset) {
      // First half: pan down from start, old content exits up
      camera.y = restartCamYStart - ease * totalDistance;
    } else {
      // Second half: continue from +clearance down to 0
      // At the swap point, ease was 0.5, camera.y was set to +clearance
      // Map ease from 0.5→1 to clearance→0
      var t = (ease - 0.5) * 2; // 0→1 over second half
      camera.y = clearance * (1 - t);
    }

    camera.vy = camera.y - prevCamY;
    camera.scrollX += camera.vx * dt;
    camera.scrollY += camera.vy;

    // Character floats through the transition with a sine wave (+400 to -400 from center)
    var charScreenY = 560 + Math.sin(restartProgress * Math.PI * 2 + Math.PI / 2) * 640;
    if (charScreenY < -character.size) {
      // Once above the camera, remove from view for the rest of the transition
      character.centerX = -9999;
      character.centerY = -9999;
    } else if (character.centerX !== -9999) {
      character.centerX = -camera.x + camera.width / 2;
      character.centerY = charScreenY - camera.y;
    }

    // Swap at midpoint — content is off screen, camera moving fastest
    if (!restartGameReset && restartProgress >= 0.5) {
      restartGameReset = true;

      var savedCamX = camera.x;
      var savedScrollX = camera.scrollX;
      var savedScrollY = camera.scrollY;

      clearVariables();

      // Restore camera so stars generate around where the player was
      camera.x = savedCamX;
      camera.scrollX = savedScrollX;
      camera.scrollY = savedScrollY;

      // Generate new level centered on screen
      var screenCenterX = -savedCamX + camera.width / 2;
      gameSetup(screenCenterX);

      // Reposition camera so new content (at world Y=0) is below viewport
      camera.y = clearance;

      character.centerX = -9999;
      character.centerY = -9999;
      return;
    }

    // Sweep complete — start character falling
    if (restartProgress >= 1) {
      camera.y = 0;
      camera.vx = 0;
      camera.vy = 0;
      restartPhase = 'falling';

      character.centerX = starHooks[0].centerX - 240;
      character.centerY = -(character.size);
      physics.vx = 0;
      physics.vy = 0;
    }
  }

  // Character falls in — gravity handled by characterFalling() in updateGame()
  if (restartPhase === 'falling') {
    // Find star closest to screen center
    var screenCenterX = -camera.x + camera.width / 2;
    var nearestIdx = 0;
    var nearestDist = Infinity;
    for (var i = 0; i < starHooks.length; i++) {
      var d = Math.abs(starHooks[i].centerX - screenCenterX);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }

    if (character.centerY >= starHooks[nearestIdx].centerY + 40) {
      restartPhase = 'idle';
      gameState = "playGame";
      hookAlpha = 1;
      infiniteGen.startX = starHooks[nearestIdx].centerX;
      infiniteGen.maxDistance = 0;
      starImmunity.immune = true;
      cameraFollowHook();
      changeHook(nearestIdx);
    }
  }
}
