function setupGameOverAnimation() {
  gameState = 'animateGameOver';
  animateGameOver.state = 1;
  soundFalling();
  updateGameOver();
}

//--------

var animateGameOver = {
  state: 1,
  overlayAlpha: 0,
  amount: null
}

function updateGameOverAnimation() {

  //::state 1
  // Camera move up X amount
  if (animateGameOver.state === 1) {

    var anim = {
      from: camera.y,
      to: camera.y-200,
      duration: 16,
      easing: 'easeOutQuad'
    }

    val = animateNum(anim.from,anim.to,anim.duration,anim.easing);

    camera.vy = val.value - camera.y;
    camera.y = val.value;

    if (val.complete === true) {
      animateGameOver.state = 2;
    }
  }


  //::state 2
  // Camera move down + slow
  if (animateGameOver.state === 2) {
      var anim = {
        from: camera.y,
        to: camera.y+200,
        duration: 32,
        easing: 'easeOutQuad'
      }

      val = animateNum(anim.from,anim.to,anim.duration,anim.easing);

      camera.vy = val.value - camera.y;
      camera.y = val.value;

      if (val.complete === true) {
        animateGameOver.state = 3;
      }
  }

  //::state 3
  if (animateGameOver.state === 3) {
    gameState = 'gameOver';
    animateGameOver.state = 1;
    return;
  }
}
