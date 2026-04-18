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

  // Logo tuning for the landing page (bigger and a touch higher than the
  // in-game menu). Also overrides the game's createLogo so the SVG src
  // resolves from the repo root.
  var LOGO_SCALE     = 1.0;
  var LOGO_Y_OFFSET  = -160; // -120 in the main game menu

  function createLandingLogo() {
    var width  = Math.round(372 * LOGO_SCALE);
    var height = Math.round(120 * LOGO_SCALE);

    logo.canvas = document.createElement('canvas');
    logo.canvas.width  = width;
    logo.canvas.height = height;
    logo.context = logo.canvas.getContext('2d');
    logo.width  = width;
    logo.height = height;
    logo.posX = (camera.width  / 2) - (logo.width  / 2);
    logo.posY = (camera.height / 2) - (logo.height / 2) + LOGO_Y_OFFSET;

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

  var PLATFORM_Y_OFFSET = 200; // +120 in the main game menu; +80 lower here

  function repositionMenuElements() {
    logo.posX     = (camera.width  / 2) - (logo.width     / 2);
    logo.posY     = (camera.height / 2) - (logo.height    / 2) + LOGO_Y_OFFSET;
    platform.posX = (camera.width  / 2) - (platform.width / 2);
    platform.posY = (camera.height / 2) - (platform.height / 2) + PLATFORM_Y_OFFSET;
  }

  // ── Intro animation ───────────────────────────────────────────────────────
  // Mirrors the main game's menuStage 5 reveal: camera starts below the scene
  // so all elements are off-screen, then eases to y=0 over ~4 seconds while
  // the logo fades in. Background stars and clouds parallax through camera.y
  // the same way they do in the game.
  var intro = {
    active: true,
    progress: 0,
    camYStart: 0,
    offsetY: 0,     // intro's own contribution to camera.y (combined with scroll)
    duration: 360 // frames at 60fps — ~6s, gentler than the in-game 4s reveal
  };

  // ── Scroll-driven parallax ───────────────────────────────────────────────
  // As the page scrolls, feed the banner's scroll position into camera.y so
  // every parallax layer (stars, clouds, galaxy, logo, platform) shifts at
  // its own depth — same system the game's intro pan uses.
  var scrollOffsetY = 0;
  // How strongly scrolling drives camera.y. A subtle 0.1 keeps the effect
  // present but unobtrusive — deep layers barely shift, foreground nudges.
  var SCROLL_PARALLAX_K = 0.1;

  function updateScrollOffset() {
    var bannerH = bannerEl.offsetHeight || 1;
    // Clamp to the banner's height — once it's scrolled past, no point
    // pushing the offset further.
    var sy = Math.max(0, Math.min(window.scrollY || window.pageYOffset || 0, bannerH));
    scrollOffsetY = -sy * SCROLL_PARALLAX_K;
  }

  window.addEventListener('scroll', updateScrollOffset, { passive: true });

  // Fraction of the full off-screen distance to actually pan. 1.0 mirrors the
  // in-game intro (elements start fully below); 0.5 halves the travel so the
  // reveal is more subtle.
  var INTRO_DISTANCE = 0.5;

  function startIntro() {
    // Full distance = enough for the shallowest-parallax element (logo at
    // parallax 0.3) to be off-screen below. Scaled by INTRO_DISTANCE.
    var full = Math.ceil((camera.height - logo.posY + 100) / parallax.logo);
    intro.camYStart = Math.ceil(full * INTRO_DISTANCE);
    intro.offsetY = intro.camYStart;
    camera.y  = intro.offsetY + scrollOffsetY;
    camera.vy = 0;
    camera.scrollY = 0;
    logo.alpha = 0;
    intro.progress = 0;
    intro.active = true;
  }

  function tickIntro() {
    if (!intro.active) return;

    intro.progress += (1 / intro.duration) * dt;
    if (intro.progress > 1) intro.progress = 1;

    // easeInOutCubic — gentle start, smooth middle, soft landing
    var t = intro.progress;
    var ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    intro.offsetY = intro.camYStart * (1 - ease);
    logo.alpha = Math.min(ease * 1.5, 1);

    if (intro.progress >= 1) {
      intro.offsetY = 0;
      logo.alpha = 1;
      intro.active = false;
    }
  }

  // Combine the intro offset with the scroll-driven offset and update the
  // camera's scroll accumulators (used by background/galaxy/twinkle layers).
  function applyCameraParallax() {
    var prevY = camera.y;
    camera.y  = intro.offsetY + scrollOffsetY;
    camera.vy = camera.y - prevY;
    camera.scrollY += camera.vy;
  }

  // ── Click-triggered mini autoplay ─────────────────────────────────────────
  // Clicking the character spawns a short, scripted "autoplay" flight: the
  // character launches off the platform, grapples to a couple of stars, goes
  // off-screen, then re-enters by either falling onto the platform or swinging
  // back from the opposite side.
  //
  // This is *not* the engine's autoplay — it's self-contained physics tuned
  // for the landing page. Swings are a pendulum (dθ/dt² = g·cos(θ)/L with
  // light damping); flights are simple projectile motion.
  var autoplay = {
    active: false,
    phase: 'idle',   // 'fly' | 'swing' | 'offscreen' | 'return-fall' | 'landing'
    dir: 1,
    returnType: 'fall',
    stars: [],
    currentStar: 0,
    pivot: null,
    ropeLength: 0,
    angle: 0,
    angVel: 0,
    vx: 0,
    vy: 0,
    swingTime: 0,
    offscreenTimer: 0,
    landingTimer: 0,
    safety: 0
  };

  var AP_GRAVITY       = 0.45;
  var AP_CATCH_RADIUS  = 120;
  var AP_SWING_DURATION = 38;   // frames on each rope before release
  var AP_OFFSCREEN_HOLD = 48;   // frames the character stays off-screen
  var AP_MAX_RUNTIME    = 720;  // hard cap (12s) in case tuning goes wrong
  var AP_PAD            = 120;  // off-screen margin

  function hitTestCharacter(cx, cy) {
    var r = character.size * 0.6; // forgiving hit area
    var dx = cx - character.centerX;
    var dy = cy - character.centerY;
    return (dx * dx + dy * dy) <= r * r;
  }

  function pageToCameraCoords(clientX, clientY) {
    var rect = canvasEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (camera.width  / rect.width),
      y: (clientY - rect.top)  * (camera.height / rect.height)
    };
  }

  canvasEl.addEventListener('click', function (ev) {
    if (autoplay.active || intro.active) return;
    var p = pageToCameraCoords(ev.clientX, ev.clientY);
    if (hitTestCharacter(p.x, p.y)) triggerAutoplay();
  });

  function triggerAutoplay() {
    autoplay.active      = true;
    autoplay.dir         = Math.random() < 0.5 ? 1 : -1;
    autoplay.returnType  = Math.random() < 0.5 ? 'fall' : 'swing';
    autoplay.currentStar = 0;
    autoplay.safety      = 0;

    var platMidX = platform.posX + platform.width / 2;
    var landY    = platform.posY + platform.hover + 26 - character.size / 2;
    var d        = autoplay.dir;

    // Three stars that carry the character up-and-outward off-screen.
    autoplay.stars = [
      { x: platMidX + d * 260, y: landY - 140, alpha: 0, consumed: false, ring: 'red'  },
      { x: platMidX + d * 520, y: landY - 260, alpha: 0, consumed: false, ring: 'red'  },
      { x: platMidX + d * 820, y: landY - 140, alpha: 0, consumed: false, ring: 'cyan' }
    ];

    // Initial launch: up-and-forward ballistic that reaches the first hook.
    autoplay.vx    = 6 * d;
    autoplay.vy    = -12;
    autoplay.phase = 'fly';
  }

  function fadeStars() {
    for (var i = 0; i < autoplay.stars.length; i++) {
      var s = autoplay.stars[i];
      if (!s.consumed && s.alpha < 1) s.alpha = Math.min(1, s.alpha + 0.05 * dt);
      if ( s.consumed && s.alpha > 0) s.alpha = Math.max(0, s.alpha - 0.06 * dt);
    }
  }

  function offScreenCheck() {
    return character.centerX < -AP_PAD ||
           character.centerX >  camera.width  + AP_PAD ||
           character.centerY >  camera.height + AP_PAD ||
           character.centerY < -AP_PAD * 2;
  }

  function tryCatchNextHook() {
    if (autoplay.currentStar >= autoplay.stars.length) return false;
    var star = autoplay.stars[autoplay.currentStar];
    if (star.consumed) return false;
    var dx = star.x - character.centerX;
    var dy = star.y - character.centerY;
    var d  = Math.sqrt(dx * dx + dy * dy);
    if (d > AP_CATCH_RADIUS || d < 8) return false;

    autoplay.pivot      = star;
    autoplay.ropeLength = d;
    // Angle from pivot to character (with y growing downward)
    autoplay.angle  = Math.atan2(-dy, -dx);
    // Project linear velocity onto tangent to get starting angular velocity
    var tx = -Math.sin(autoplay.angle);
    var ty =  Math.cos(autoplay.angle);
    var tangentSpeed = autoplay.vx * tx + autoplay.vy * ty;
    autoplay.angVel    = tangentSpeed / d;
    autoplay.swingTime = 0;
    autoplay.phase     = 'swing';
    return true;
  }

  function releaseFromHook() {
    var tx = -Math.sin(autoplay.angle);
    var ty =  Math.cos(autoplay.angle);
    var speed = autoplay.angVel * autoplay.ropeLength;
    autoplay.vx = tx * speed;
    autoplay.vy = ty * speed;
    autoplay.stars[autoplay.currentStar].consumed = true;
    autoplay.currentStar++;
    autoplay.phase = 'fly';
  }

  function startReturnFall() {
    autoplay.stars = [];
    character.centerX = platform.posX + platform.width / 2;
    character.centerY = -80;
    autoplay.vx = 0;
    autoplay.vy = 2;
    autoplay.phase = 'return-fall';
  }

  function startReturnSwing() {
    var oppDir   = -autoplay.dir;
    var platMidX = platform.posX + platform.width / 2;
    var landY    = platform.posY + platform.hover + 26 - character.size / 2;

    // Single cyan hook high on the opposite side — character swings through
    // the bottom of the arc and lands back on the platform.
    var hook = { x: platMidX + oppDir * 320, y: landY - 300,
                 alpha: 0, consumed: false, ring: 'cyan' };
    autoplay.stars       = [hook];
    autoplay.currentStar = 0;

    // Spawn off-screen on the opposite side, heading inward and slightly up.
    character.centerX = platMidX + oppDir * (camera.width * 0.55 + AP_PAD);
    character.centerY = landY - 140;
    autoplay.vx = -oppDir * 9;
    autoplay.vy = -3;
    autoplay.phase = 'fly';
  }

  function tryLandOnPlatform() {
    var landY = platform.posY + platform.hover + 26 - character.size / 2;
    if (character.centerY < landY - 2) return false;
    // Generous x-window so we're not too strict about sticking the landing.
    var slack = 40;
    if (character.centerX < platform.posX - slack) return false;
    if (character.centerX > platform.posX + platform.width + slack) return false;

    character.centerX = platform.posX + platform.width / 2;
    character.centerY = landY;
    autoplay.phase = 'landing';
    autoplay.landingTimer = 0;
    return true;
  }

  function endAutoplay() {
    autoplay.active = false;
    autoplay.phase = 'idle';
    autoplay.stars = [];
    autoplay.pivot = null;
  }

  function tickAutoplay() {
    if (!autoplay.active) return;
    autoplay.safety += dt;
    if (autoplay.safety > AP_MAX_RUNTIME) { endAutoplay(); return; }

    fadeStars();

    switch (autoplay.phase) {

      case 'fly':
        autoplay.vy += AP_GRAVITY * dt;
        character.centerX += autoplay.vx * dt;
        character.centerY += autoplay.vy * dt;

        if (tryCatchNextHook()) break;

        if (autoplay.currentStar >= autoplay.stars.length && tryLandOnPlatform()) break;

        if (offScreenCheck()) {
          if (autoplay.currentStar >= autoplay.stars.length) {
            // Finished departure — hand off to the return sequence.
            autoplay.phase = 'offscreen';
            autoplay.offscreenTimer = 0;
          } else {
            // Missed a hook and left the scene — fall through to return too.
            autoplay.phase = 'offscreen';
            autoplay.offscreenTimer = 0;
          }
        }
        break;

      case 'swing':
        // Pendulum: angle measured from +x, y grows down.
        // d(angVel)/dt = (g / L) * cos(angle). Light damping keeps swings tame.
        autoplay.angVel += (AP_GRAVITY / autoplay.ropeLength) * Math.cos(autoplay.angle) * dt;
        autoplay.angVel *= Math.pow(0.998, dt);
        autoplay.angle  += autoplay.angVel * dt;

        character.centerX = autoplay.pivot.x + Math.cos(autoplay.angle) * autoplay.ropeLength;
        character.centerY = autoplay.pivot.y + Math.sin(autoplay.angle) * autoplay.ropeLength;

        autoplay.swingTime += dt;
        if (autoplay.swingTime >= AP_SWING_DURATION) releaseFromHook();
        break;

      case 'offscreen':
        autoplay.offscreenTimer += dt;
        if (autoplay.offscreenTimer > AP_OFFSCREEN_HOLD) {
          if (autoplay.returnType === 'fall') startReturnFall();
          else                                 startReturnSwing();
        }
        break;

      case 'return-fall':
        autoplay.vy += AP_GRAVITY * dt;
        character.centerX += autoplay.vx * dt;
        character.centerY += autoplay.vy * dt;
        tryLandOnPlatform();
        break;

      case 'landing':
        autoplay.landingTimer += dt;
        if (autoplay.landingTimer > 18) endAutoplay();
        break;
    }
  }

  function drawAutoplay(ctx) {
    if (!autoplay.active && autoplay.stars.length === 0) return;

    // Rope from pivot to character when swinging — drawn behind stars & char.
    if (autoplay.phase === 'swing' && autoplay.pivot) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(autoplay.pivot.x, autoplay.pivot.y);
      ctx.lineTo(character.centerX, character.centerY);
      ctx.stroke();
      ctx.restore();
    }

    // Stars: white center + coloured ring matching the game's hook types.
    for (var i = 0; i < autoplay.stars.length; i++) {
      var s = autoplay.stars[i];
      if (s.alpha <= 0.005) continue;
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = (s.ring === 'cyan') ? '#40e0ff' : '#ff4040';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Animated background cloud band ────────────────────────────────────────
  // The engine's drawBackgroundClouds computes a drift offset but then draws
  // the cloud at x=0, so this layer stays static. Reimplement with a rolling
  // offset and two tiled draws for seamless wrap. Also applies camera.y
  // parallax so the band rides with the intro pan.
  var bgCloudOffset = 0;
  function drawAnimatedBgClouds(context) {
    var tile = backgroundClouds[0];
    if (!tile) return;
    var tileW = tile.canvas.width;

    bgCloudOffset -= 0.15 * dt;
    while (bgCloudOffset <= -tileW) bgCloudOffset += tileW;

    var y = (camera.height - 160) + camera.y * parallax.cloud1;
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

    tickIntro();
    tickAutoplay();
    applyCameraParallax();

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
    // background and foreground clouds. Each layer applies its own parallax
    // to camera.y so the intro pan reveals them at different speeds.
    var gctx = gameMenu.context;
    gctx.clearRect(0, 0, camera.width, camera.height);

    gctx.save();
    gctx.globalAlpha = logo.alpha;
    gctx.drawImage(logo.canvas, logo.posX, logo.posY + camera.y * parallax.logo);
    gctx.restore();

    drawPlatformScene(gctx, camera.y);

    // When autoplay is running it owns the character position. Otherwise
    // park the character on the platform (tracking hover + camera parallax).
    if (!autoplay.active) {
      var platScreenY = platform.posY + platform.hover + camera.y * parallax.platform;
      character.centerX = platform.posX + platform.width / 2;
      character.centerY = platScreenY + 26 - character.size / 2;
    }

    drawAutoplay(gctx);
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
  // then position elements, prime the intro, and kick off the loop.
  requestAnimationFrame(function () {
    repositionMenuElements();
    updateScrollOffset(); // honor initial scroll position on page reload
    startIntro();
    requestAnimationFrame(runLanding);
  });

})();
