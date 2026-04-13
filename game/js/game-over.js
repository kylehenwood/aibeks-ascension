var gameOverElems = [];
var gameOverAlpha = 0;

function setupGameOver() {
  gameOver.canvas = document.createElement('canvas');
  gameOver.canvas.width = camera.width;
  gameOver.canvas.height = camera.height;
  gameOver.context = gameOver.canvas.getContext('2d');

  // back to menu button
  createIntroButton();
  gameOverElems.push(introButton);

  // restart button
  createRestartButton();
  gameOverElems.push(restartButton);

}

function repositionGameOverButtons() {
  restartButton.posX = 24;
  restartButton.posY = camera.height - restartButton.height - 24;
  introButton.posX = camera.width - introButton.width - 24;
  introButton.posY = camera.height - introButton.height - 24;
}

function updateGameOver() {
  repositionGameOverButtons();
  gameOver.context.clearRect(0,0,camera.width,camera.height)

  // Fade in
  if (gameOverAlpha < 1) {
    gameOverAlpha += 0.03 * dt;
    if (gameOverAlpha > 1) gameOverAlpha = 1;
  }

  gameOver.context.save();
  gameOver.context.globalAlpha = gameOverAlpha;

  gameOver.context.fillStyle = 'white';
  gameOver.context.font = '24px sans-serif';
  gameOver.context.textAlign = "center";
  gameOver.context.fillText('GAME OVER', camera.width/2, camera.height/2-80);

  // score
  gameOver.context.font = '18px sans-serif';
  gameOver.context.fillText('DISTANCE: ' + gameUserInterface.score + 'm', camera.width/2, camera.height/2-48);

  // button background
  gameOver.context.beginPath();
  gameOver.context.rect(0, camera.height-112, camera.width, 112);
  gameOver.context.fillStyle = 'rgba(000,000,000,0.4)';
  gameOver.context.fill();

  // intro button
  gameOver.context.drawImage(introButton.canvas,introButton.posX,introButton.posY);

  // restart button
  gameOver.context.drawImage(restartButton.canvas,restartButton.posX,restartButton.posY);

  gameOver.context.restore();
}
