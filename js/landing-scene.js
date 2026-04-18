// Landing-page atmospheric scene.
//
// Reuses the game engine's globals and draw functions (character, platform,
// logo, background stars, clouds, campfire, floating rocks) but runs its own
// minimal setup + RAF loop. None of the gameplay / UI / input code is wired
// up, so there's no FPS readout, no dev-border, no play button.

(function () {

  var bannerEl = document.querySelector('.banner');
  var canvasEl = document.getElementById('js-starswinger');

  // ── Camera sizing ─────────────────────────────────────────────────────────
  // DOM canvas, logical canvas, and camera are all the same size as the
  // banner. No dev-space halo, no logical/physical mismatch — assets draw in
  // banner-pixel coordinates. renderScale is still applied to the canvas
  // attribute so the backing store is crisp on hi-dpi displays.
  function setupLandingCanvas() {
    canvas.id = canvasEl;
    canvas.context = canvasEl.getContext('2d');

    var rect = bannerEl.getBoundingClientRect();

    camera.width  = Math.round(rect.width);
    camera.height = Math.round(rect.height);

    canvas.width  = camera.width;
    canvas.height = camera.height;

    canvasEl.setAttribute('width',  canvas.width  * renderScale);
    canvasEl.setAttribute('height', canvas.height * renderScale);

    camera.offsetX = 0;
    camera.offsetY = 0;
  }

  // The game's createLogo loads 'art/title-white.svg' relative to the HTML
  // document. From the repo root that would resolve to /art/... which does
  // not exist; the SVG lives at game/art/title-white.svg. Override here.
  function createLandingLogo() {
    var scale = 0.72;
    var width  = Math.round(372 * scale);
    var height = Math.round(120 * scale);

    logo.canvas = document.createElement('canvas');
    logo.canvas.width  = width;
    logo.canvas.height = height;
    logo.context = logo.canvas.getContext('2d');
    logo.width  = width;
    logo.height = height;
    logo.posX = (camera.width  / 2) - (logo.width  / 2);
    logo.posY = (camera.height / 2) - (logo.height / 2) - 120;

    var img = new Image();
    img.onload = function () {
      logo.context.drawImage(img, 0, 0, width, height);
    };
    img.src = 'game/art/title-white.svg';
  }

  // ── One-time scene construction ───────────────────────────────────────────
  function setupScene() {
    setupLandingCanvas();

    setupCharacter();
    setupBackground();
    setupForeground();

    // Offscreen menu canvas that screen-menu.js expects; created manually
    // since we don't call createMenu() (it also builds the play button).
    gameMenu.canvas = document.createElement('canvas');
    gameMenu.canvas.width  = camera.width;
    gameMenu.canvas.height = camera.height;
    gameMenu.context = gameMenu.canvas.getContext('2d');

    createLandingLogo();
    createPlatform();

    // Neutralize the play button — detail-foreground.js reads
    // playButton.alpha for the cyan button glow through the clouds.
    playButton.alpha = 0;
    playButton.hover = false;
    playButton.hoverT = 0;

    // gameMenu state keeps the foreground cloud code on its "menu" path
    // (glow masking is gated by playButton.alpha, which is 0, so no glow).
    gameState = 'gameMenu';

    character.centerX = camera.width  / 2;
    character.centerY = camera.height / 2;
  }

  function repositionMenuElements() {
    logo.posX     = (camera.width  / 2) - (logo.width     / 2);
    logo.posY     = (camera.height / 2) - (logo.height    / 2) - 120;
    platform.posX = (camera.width  / 2) - (platform.width / 2);
    platform.posY = (camera.height / 2) - (platform.height / 2) + 120;
  }

  // ── Animated background cloud band ────────────────────────────────────────
  // The engine's drawBackgroundClouds computes a drift offset but then draws
  // the cloud at x=0, so this layer stays static. Reimplement with a rolling
  // offset and two tiled draws for seamless wrap.
  var bgCloudOffset = 0;
  function drawAnimatedBgClouds(context) {
    var tile = backgroundClouds[0];
    if (!tile) return;
    var tileW = tile.canvas.width;

    bgCloudOffset -= 0.15 * dt;
    while (bgCloudOffset <= -tileW) bgCloudOffset += tileW;

    var y = camera.height - 160;
    context.drawImage(tile.canvas, bgCloudOffset,         y);
    context.drawImage(tile.canvas, bgCloudOffset + tileW, y);
  }

  // ── Render loop ───────────────────────────────────────────────────────────
  function runLanding(timestamp) {
    requestAnimationFrame(runLanding);

    if (lastFrameTime === 0) lastFrameTime = timestamp;
    var elapsed = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    dt = (elapsed > 0 && elapsed < 200) ? elapsed / targetFrameMs : 1;

    clear(canvas);

    canvas.context.save();
    canvas.context.scale(renderScale, renderScale);

    // Deep-space gradient + parallax star layers across the full canvas.
    drawBackground();

    // Clip everything below to the camera region (matches how the game
    // composites the menu scene).
    var cox = camera.offsetX;
    var coy = camera.offsetY;
    canvas.context.save();
    canvas.context.translate(cox, coy);
    canvas.context.beginPath();
    canvas.context.rect(0, 0, camera.width, camera.height);
    canvas.context.clip();

    // Menu scene composited offscreen first, then layered between the
    // background and foreground clouds.
    var gctx = gameMenu.context;
    gctx.clearRect(0, 0, camera.width, camera.height);
    gctx.drawImage(logo.canvas, logo.posX, logo.posY);
    drawPlatformScene(gctx);
    character.centerX = platform.posX + platform.width / 2;
    character.centerY = platform.posY + platform.hover + 26 - character.size / 2;
    drawCharacter(gctx);

    drawAnimatedBgClouds(canvas.context);
    canvas.context.drawImage(gameMenu.canvas, 0, 0);
    drawForeground(canvas.context, true);

    canvas.context.restore(); // clip
    canvas.context.restore(); // renderScale
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  // Banner aspect changes when the window width changes. Rebuild star / cloud
  // tiles so they keep covering the new camera dims.
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      setupLandingCanvas();
      setupBackground();
      setupForeground();
      repositionMenuElements();
    }, 120);
  });

  // ── Go ────────────────────────────────────────────────────────────────────
  setupScene();
  // Give createLogo a frame to load its SVG image (it draws asynchronously),
  // then position elements and kick off the loop.
  requestAnimationFrame(function () {
    repositionMenuElements();
    requestAnimationFrame(runLanding);
  });

})();
