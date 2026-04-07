var gameOverElems = [];

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

function updateGameOver() {

  gameOver.context.clearRect(0,0,camera.width,camera.height)

  gameOver.context.fillStyle = 'white';
  gameOver.context.font = '24px sans-serif';
  gameOver.context.textAlign = "center";
  gameOver.context.fillText('GAME OVER (Press "R" to restart)', camera.width/2, camera.height/2-80);

  // button background
  gameOver.context.beginPath();
  gameOver.context.rect(0, camera.height-112, camera.width, 112);
  gameOver.context.fillStyle = 'rgba(000,000,000,0.4)';
  gameOver.context.fill();

  // intro button
  gameOver.context.drawImage(introButton.canvas,introButton.posX,introButton.posY);

  // restart button
  gameOver.context.drawImage(restartButton.canvas,restartButton.posX,restartButton.posY);
}
