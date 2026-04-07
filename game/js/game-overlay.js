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
