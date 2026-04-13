function setupGameOverAnimation() {
  gameState = 'animateGameOver';
  animateGameOver.state = 1;
  // Scale bob to character speed, capped at 100px
  var speed = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);
  animateGameOver.bobAmount = Math.min(speed * 8, 100);
  // Capture starting velocity for spring deceleration
  animateGameOver.startVx = camera.vx;
  animateGameOver.springProgress = 0;
  camera.target = null;
  soundFalling();
  gameOverAlpha = 0;
  updateGameOver();
}

//--------

var animateGameOver = {
  state: 1,
  overlayAlpha: 0,
  amount: null,
  bobAmount: 100,
  startVx: 0,
  springProgress: 0
}

function updateGameOverAnimation() {

  // Spring deceleration: slows down, overshoots past 0, settles
  animateGameOver.springProgress += 0.008 * dt;
  if (animateGameOver.springProgress > 1) animateGameOver.springProgress = 1;
  var t = animateGameOver.springProgress;
  // Damped spring: decays with overshoot
  var spring = Math.exp(-6 * t) * Math.cos(t * Math.PI * 2.5);
  camera.vx = animateGameOver.startVx * spring;

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
