// start a game
function startGame() {
  gameState = "playGame";
  hookAlpha = 1;
  physics.vx = 0;
  physics.vy = 0;

  // Set starting position for distance score
  infiniteGen.startX = starHooks[0].centerX;
  infiniteGen.maxDistance = 0;

  starImmunity.immune = true;
  changeHook(0);
}
