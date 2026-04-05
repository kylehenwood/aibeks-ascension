function setupGameOverAnimation() {
  gameState = 'animateGameOver';
  animateGameOver.state = 1;
  // Scale bob to character speed, capped at 100px
  var speed = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);
  animateGameOver.bobAmount = Math.min(speed * 8, 100);
  camera.target = null;
  soundFalling();
  updateGameOver();
}

//--------

var animateGameOver = {
  state: 1,
  overlayAlpha: 0,
  amount: null,
  bobAmount: 100
}

function updateGameOverAnimation() {

  // Decelerate horizontal scroll to 0
  camera.vx *= 0.99;

  //::state 1
  // Camera move up X amount
  if (animateGameOver.state === 1) {

    var anim = {
      from: camera.y,
      to: camera.y - animateGameOver.bobAmount,
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
        to: camera.y + animateGameOver.bobAmount,
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
    camera.vx = 0;
    camera.vy = 0;
    gameState = 'gameOver';
    animateGameOver.state = 1;
    return;
  }
}
