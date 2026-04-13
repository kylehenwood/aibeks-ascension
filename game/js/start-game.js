// start a game
function startGame() {
  gameState = "playGame";
  hookAlpha = 1;
  physics.vx = 0;
  physics.vy = 0;

  // Find the star closest to screen center
  var screenCenterX = -camera.x + camera.width / 2;
  var bestIdx = 0;
  var bestDist = Infinity;
  for (var i = 0; i < starHooks.length; i++) {
    var d = Math.abs(starHooks[i].centerX - screenCenterX);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  // Set starting position for distance score
  infiniteGen.startX = starHooks[bestIdx].centerX;
  infiniteGen.maxDistance = 0;

  starImmunity.immune = true;
  changeHook(bestIdx);
}
