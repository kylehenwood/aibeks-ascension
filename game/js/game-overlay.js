// Off-screen star indicator — shows when the next star is beyond the right edge
function drawNextStarIndicator(context) {
  if (starHooks.length === 0) return;

  // Find the next star in sequence after the currently selected hook
  // If no hook selected, find the first alive star ahead of the character
  var next = null;
  if (selectedHook) {
    var idx = selectedHook.star.index;
    for (var i = idx + 1; i < starHooks.length; i++) {
      if (starHooks[i].star.alive) { next = starHooks[i]; break; }
    }
  } else {
    var charScreenX = character.centerX + camera.x;
    for (var i = 0; i < starHooks.length; i++) {
      if (!starHooks[i].star.alive) continue;
      if (starHooks[i].centerX + camera.x > charScreenX) { next = starHooks[i]; break; }
    }
  }
  if (!next) return;

  var screenX = next.centerX + camera.x;
  var screenY = next.centerY + camera.y;

  // Only show when star is off-screen to the right
  var overflow = screenX - camera.width;
  if (overflow <= 0) return;

  // Fade: full alpha at 200+ px off-screen, fades to 0 as it reaches the edge
  var fadeRange = 200;
  var alpha = Math.min(overflow / fadeRange, 1);

  var tipX = camera.width - 16;
  var tipY = Math.max(20, Math.min(screenY, camera.height - 20));

  context.save();
  context.globalAlpha = alpha * 0.8;

  // Small chevron pointing right
  context.fillStyle = 'white';
  context.beginPath();
  context.moveTo(tipX, tipY);
  context.lineTo(tipX - 10, tipY - 6);
  context.lineTo(tipX - 10, tipY + 6);
  context.closePath();
  context.fill();

  // Label
  context.font = 'bold 11px sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  context.fillText('Star', tipX - 14, tipY);

  context.restore();
}

var gameOverlay = {
  alpha: 0,
  maxAlpha: 0.4
};

function drawGameOverlay(context,state) {
  // fade out
  if (state === 'fade-out') {
    if (gameOverlay.alpha > 0) {
      gameOverlay.alpha -= 0.04*dt;
    } else {
      gameOverlay.alpha = 0;
      //return;
    }
  }

  // fade in
  if (state === 'fade-in') {
    if (gameOverlay.alpha < gameOverlay.maxAlpha) {
      gameOverlay.alpha += 0.02*dt;
    } else {
      gameOverlay.alpha = gameOverlay.maxAlpha;
    }
  }
  //console.log(state+','+gameOverlay.alpha);
  context.fillStyle = 'rgba(000,000,000,'+gameOverlay.alpha+')';
  context.fillRect(0,0,camera.width,camera.height);
}
