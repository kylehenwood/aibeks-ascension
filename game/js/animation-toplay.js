function animateStart() {
  gameSetup();
  gameState = 'animateGameStart';
  hookAlpha = 0; // stars start invisible and fade in

  // character starts at platform center
  character.centerX = platform.posX + platform.width / 2;
  character.centerY = platform.posY + 26 - character.size / 2;

  // store platform/logo starting positions for parallax
  start.platformStartX = platform.posX;
  start.logoStartX = logo.posX;
  start.logoStartY = logo.posY;
  start.charStartX = character.centerX;
  start.charStartY = character.centerY;

  // target: first star position
  if (starHooks.length > 0) {
    start.targetX = starHooks[0].centerX;
    start.targetY = starHooks[0].centerY;
  } else {
    start.targetX = canvas.width;
    start.targetY = canvas.height / 2;
  }

  // reset variables
  start.state = 1;
  start.progress = 0;
  start.logoAlpha = 1;
  start.platformAlpha = 1;
}

var start = {
  state: 1,
  progress: 0,
  logoAlpha: 1,
  platformAlpha: 1,
  platformStartX: 0,
  logoStartX: 0,
  logoStartY: 0,
  charStartX: 0,
  charStartY: 0,
  targetX: 0,
  targetY: 0
}


function updateStart() {

  var context = canvas.context;

  //----
  // State 1: Character slowly walks to right edge of platform
  if (start.state === 1) {
    start.progress += 0.005 * dt;
    if (start.progress > 1) start.progress = 1;

    // easeInOutQuad for smooth walk
    var t = start.progress;
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // walk from center to right edge of platform
    var walkDist = platform.width * 0.3;
    character.centerX = start.charStartX + walkDist * ease;
    character.centerY = start.charStartY;

    // draw platform and logo
    context.drawImage(logo.canvas, logo.posX, logo.posY);
    context.drawImage(platform.canvas, platform.posX, platform.posY);

    // campfire
    var fireCx = platform.posX + platform.width * 0.2;
    var fireBaseY = platform.posY + 28;
    drawCampfireFlames(context, fireCx, fireBaseY, platform.time, 1.6);
    platform.time += 0.016 * dt;

    // start fading in hooks early
    if (start.progress > 0.5 && hookAlpha < 1) {
      hookAlpha += 0.01 * dt;
      if (hookAlpha > 1) hookAlpha = 1;
    }

    if (start.progress >= 1) {
      start.state = 2;
      start.progress = 0;
      start.charStartX = character.centerX;
      start.charStartY = character.centerY;
    }
  }

  //----
  // State 2: Small hop off platform edge, then grapple pulls to star
  if (start.state === 2) {
    start.progress += 0.02 * dt;
    if (start.progress > 1) start.progress = 1;

    var t = start.progress;

    // Small hop: character jumps ~60px right and arcs up
    var hopDist = 60;
    var ease = t;
    character.centerX = start.charStartX + hopDist * ease;
    var arc = Math.sin(t * Math.PI) * -40;
    character.centerY = start.charStartY + arc;

    // fade out logo and platform as character leaves
    start.logoAlpha = Math.max(0, 1 - t * 2);
    start.platformAlpha = Math.max(0, 1 - t * 1.5);

    // draw logo (fading)
    if (start.logoAlpha > 0) {
      context.save();
      context.globalAlpha = start.logoAlpha;
      context.drawImage(logo.canvas, logo.posX, logo.posY);
      context.restore();
    }

    // draw platform (fading)
    if (start.platformAlpha > 0) {
      context.save();
      context.globalAlpha = start.platformAlpha;
      context.drawImage(platform.canvas, platform.posX, platform.posY);
      context.restore();
    }

    // continue fading in hooks
    if (hookAlpha < 1) {
      hookAlpha += 0.02 * dt;
      if (hookAlpha > 1) hookAlpha = 1;
    }

    if (start.progress >= 1) {
      start.state = 3;
    }
  }

  //----
  // State 3: Grapple to first star and start game
  if (start.state === 3) {
    hookAlpha = 1;
    startGame();
  }
}
