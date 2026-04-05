function animateStart() {
  gameState = 'animateGameStart';
  character.centerX = (canvas.width/2);
  logo.alpha = 1;
  logo.posX = (canvas.width/2)-(logo.width/2);

  // reset variables
  start = {
    state: 1,
    count: 0,
    moved: 1,
    logoAlpha: 100,
    platformAlpha: 100
  }

}

var start = {
  state: 1,
  count: 0,
  moved: 1,
  logoAlpha: 100,
  platformAlpha: 100
}

var startMove = 0;





function updateStart() {

  var context = canvas.context;
  var cloudUp = 320;

  //----
  // state 1
  // Move character, platform and title
  if (start.state === 1){
    if (startMove < cloudUp-2) {
      var progress = animateEaseOut(cloudUp,startMove,12);
      startMove += progress*dt;
      //camera.vx = -progress;
      camera.x += camera.vx*dt;
      platform.posX+=camera.vx*dt;
    } else {
      start.state = 2;
      startMove = 0;
    }
    context.drawImage(platform.canvas,platform.posX,platform.posY);
  }

  //----
  // state 2
  // Jump character then grappel
  // fade in game hooks
  if (start.state === 2) {
    if (character.centerY < logo.posY+12) {
      start.state = 4;
    }
    var jumpHeight = (logo.posY-character.centerY)/8;
    character.centerY += jumpHeight*dt;
  }


  //----
  // state 4
  if (start.state === 4) {
    start.state = 1;
    startGame();
  }



  //-----------------------------------------------


  // fade out logo
  if (start.logoAlpha > 2) {
    var logoAlpha = (0-start.logoAlpha)/24;
    start.logoAlpha += logoAlpha;

    //context.save();
    //context.globalAlpha = (start.logoAlpha/100);
    context.drawImage(logo.canvas,logo.posX+=camera.vx*0.4,logo.posY);
    //context.restore();
  }

  // fade out platform
  if (start.state >= 2 && start.platformAlpha > 0+1) {
    var platformAlpha = (0-start.platformAlpha)/8;
    start.platformAlpha += platformAlpha;
    //context.save();
    //context.globalAlpha = (start.platformAlpha/100);
    context.drawImage(platform.canvas,platform.posX,platform.posY);
    //context.restore();
  }
}
