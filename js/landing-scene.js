// Landing-page atmospheric scene.
//
// Reuses the full game engine's globals and draw pipeline. On page load,
// runs a gentle custom intro pan, then hands the RAF off to the engine's
// runGame with gameState = 'gameMenu'. Clicking the character triggers the
// real play-game transition (animateStart) with autoplay enabled, so the
// engine's physics and AI fly the character around for a few seconds
// before dying and auto-returning to the menu.

(function () {

  var bannerEl = document.querySelector('.banner');
  var canvasEl = document.getElementById('js-starswinger');

  // debug-panel.js (which we don't load) owns a batch of globals that other
  // engine modules read every frame. Shim them with the same defaults the
  // debug panel would have applied on first load.
  if (typeof window.renderMode           === 'undefined') window.renderMode           = 'fullscreen';
  if (typeof window.debugStarDecayRate   === 'undefined') window.debugStarDecayRate   = 0.005;
  if (typeof window.debugStarDecayEnabled=== 'undefined') window.debugStarDecayEnabled= true;
  if (typeof window.debugGravityEnabled  === 'undefined') window.debugGravityEnabled  = true;
  if (typeof window.debugImmunityEnabled === 'undefined') window.debugImmunityEnabled = false;
  if (typeof window.debugStarsCanDie     === 'undefined') window.debugStarsCanDie     = true;
  if (typeof window.debugGrappleAssist   === 'undefined') window.debugGrappleAssist   = true; // autoplay needs this
  if (typeof window.debugCharacterDebug  === 'undefined') window.debugCharacterDebug  = false;
  if (typeof window.debugImmunityThreshold === 'undefined') window.debugImmunityThreshold = 200;

  // game-controls.js (skipped — binds global keyboard) also owns these two.
  // hookCreate / shooting-star push onto `elements`; chunk-manager and level
  // setup call drawClicky() to rebuild a debug hit-area canvas. We don't use
  // either on the landing page.
  if (typeof window.elements   === 'undefined') window.elements   = [];
  if (typeof window.drawClicky !== 'function')  window.drawClicky = function () {};

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

  // ── Logo tuning ──────────────────────────────────────────────────────────
  // Bigger and a touch higher than the in-game menu. Also overrides the
  // engine's createLogo so the SVG src resolves from the repo root.
  var LOGO_SCALE    = 1.0;
  var LOGO_Y_OFFSET = -160; // -120 in the main game menu

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

  var PLATFORM_Y_OFFSET = 200; // +120 in the main game menu; +80 lower here

  function repositionMenuElements() {
    logo.posX     = (camera.width  / 2) - (logo.width     / 2);
    logo.posY     = (camera.height / 2) - (logo.height    / 2) + LOGO_Y_OFFSET;
    platform.posX = (camera.width  / 2) - (platform.width / 2);
    platform.posY = (camera.height / 2) - (platform.height / 2) + PLATFORM_Y_OFFSET;
  }

  // ── One-time scene construction ───────────────────────────────────────────
  // Order mirrors starswinger-init.js so the engine globals all init cleanly.
  // We intentionally skip: controls() (binds global keyboard), mouseTestSetup
  // / setupMenuMouse (steals canvas clicks), createDebugPanel, createAutoplay
  // Panel, createTabNavigation.
  function setupScene() {
    setupLandingCanvas();
    setupGameCanvas();
    setupCharacter();

    // Swap in our SVG-correct createLogo before createMenu consumes it
    // (saves a 404 on 'art/title-white.svg').
    window.createLogo = createLandingLogo;

    // Menu scene construction — runs createLogo, createPlatform, createPlayButton.
    createMenu();

    pauseSetup();
    createIntro();
    setupGameOver();
    setupBackground();
    setupForeground();

    repositionMenuElements();

    // Push the play button off-screen — the engine's gameMenu render draws
    // it unconditionally. Keep alpha 0 so the cloud glow doesn't fade in.
    playButton.posX = -99999;
    playButton.posY = -99999;
    playButton.alpha = 0;

    // Idle state; runGame renders the menu scene from here.
    gameState = 'gameMenu';
    menuFirstLoad = false; // skip the engine's own menu-intro pan

    character.centerX = platform.posX + platform.width / 2;
    character.centerY = platform.posY + platform.hover + 26 - character.size / 2;
  }

  // ── Engine patches ────────────────────────────────────────────────────────
  // Silence engine UI that doesn't belong on a landing page.
  function applyEnginePatches() {
    // 1. FPS counter (game-ui.js draws "FPS: nn" at top-left every frame).
    if (typeof fpsCounter === 'function') {
      window.fpsCounter = function () {};
    }

    // 2. Unconditional 4px white dev-border strokeRect in update-raf.js. It's
    //    the only strokeRect with lineWidth === 4, so filtering by that is safe.
    var ctx = canvas.context;
    var origStrokeRect = ctx.strokeRect;
    ctx.strokeRect = function (x, y, w, h) {
      if (this.lineWidth === 4) return;
      return origStrokeRect.call(this, x, y, w, h);
    };

    // 3. drawBackgroundClouds computes a drift offset but doesn't use it —
    //    the big cloud band stays static. Replace with a tiled rolling draw
    //    that applies camera.y parallax like the engine does for the other
    //    cloud layers. Two tile copies wrap seamlessly.
    window.drawBackgroundClouds = function (context, isAnimating) {
      var tile = backgroundClouds[0];
      if (!tile) return;
      var tileW = tile.canvas.width;

      bgCloudOffset -= 0.15 * dt;
      while (bgCloudOffset <= -tileW) bgCloudOffset += tileW;

      var y = (camera.height - 160) + camera.y * parallax.cloud1;
      context.drawImage(tile.canvas, bgCloudOffset,         y);
      context.drawImage(tile.canvas, bgCloudOffset + tileW, y);
    };

    // 4. updateMenu bakes the menu scene onto an offscreen canvas with no
    //    camera.y offset, so background clouds parallax on scroll but the
    //    logo/platform/character don't. Replace with a version that honours
    //    camera.y so all layers scroll together.
    window.updateMenu = function () {
      var context = gameMenu.context;
      context.clearRect(0, 0, camera.width, camera.height);

      context.save();
      context.globalAlpha = logo.alpha;
      context.drawImage(logo.canvas, logo.posX, logo.posY + camera.y * parallax.logo);
      context.restore();

      drawPlatformScene(context, camera.y);

      var platScreenY = platform.posY + platform.hover + camera.y * parallax.platform;
      character.centerX = platform.posX + platform.width / 2;
      character.centerY = platScreenY + 26 - character.size / 2;
      drawCharacter(context);
    };

    // 5. Lock the camera during our click-triggered gameplay. Normal game has
    //    the camera following the hook / character; for the landing page we
    //    want a fixed view of the platform while autoplay flies around in it.
    var origUpdateCamera = window.updateCamera;
    console.log('[landing] patching updateCamera. orig exists:', typeof origUpdateCamera);
    window.updateCamera = function () {
      if (cameraLocked) {
        camera.x = 0;
        camera.vx = 0;
        camera.vy = 0;
        camera.targetX = 0;
        camera.targetY = 0;
        camera.target = null;
        // Still feed scroll parallax in so stars/clouds shift on page scroll.
        camera.y = scrollOffsetY;
        return;
      }
      origUpdateCamera();
    };

    // 6. Intercept the game-over trigger so we never show the death
    //    animation or the game-over screen. Snap straight back to menu.
    window.setupGameOverAnimation = function () {
      resetToMenu();
    };

    // 7. Suppress in-game HUD bits that don't belong on a landing page.
    window.drawNextStarIndicator = function () {};
    window.drawPauseIcon         = function () {};
    window.drawStarChargeBar     = function () {};
    window.scoreCounter          = function () {};

    // 7b. Sound effects — we don't call loadAudio(), so the audio objects are
    //     undefined and playing them throws. Silence them all.
    window.soundGrappelLaunch = function () {};
    window.soundGrappelHit    = function () {};
    window.soundFalling       = function () {};

    // 7c. Shift every star 120px lower on the canvas. Stars are positioned
    //     through gridPosAt by both chunkManager.generateChunk and the
    //     overlap check, so patching this helper keeps the layout consistent.
    window.gridPosAt = function (col, row) {
      return {
        positionX: gridBaseX + col * gridSize.square,
        positionY: row * gridSize.square + 120
      };
    };

    // 8. Normally drawExitingPlatform only draws while the platform is sliding
    //    off-screen and stops once it's gone. On the landing page we want it
    //    permanently visible, and we also want the logo to stay behind it —
    //    neither of which the engine does during 'starting' or 'playGame'.
    //    Redraw both every frame. No collision surface (autoplay attaches to
    //    a hook before landing anyway).
    function drawLandingPlatform(context) {
      if (platform.hoverDirection === 'up'   && platform.hover <= 0) platform.hoverDirection = 'down';
      if (platform.hoverDirection === 'down' && platform.hover >= 5) platform.hoverDirection = 'up';
      if (platform.hoverDirection === 'up') platform.hover -= 0.024 * dt;
      else                                   platform.hover += 0.024 * dt;
      platform.time += 0.016 * dt;

      // Logo sits behind the platform (matches menu layering).
      context.save();
      context.globalAlpha = logo.alpha;
      context.drawImage(logo.canvas, logo.posX, logo.posY + camera.y * parallax.logo);
      context.restore();

      var platY = platform.posY + platform.hover;
      context.drawImage(platform.canvas, platform.posX, platY);
      var fireCx = platform.posX + platform.width * 0.3;
      drawCampfireFlames(context, fireCx, platY + 32, platform.time, 1.6);
      drawFloatingRocks(context, platY, 0, platform.posX);
    }

    window.drawExitingPlatform = drawLandingPlatform;
    // drawStartPlatform (called during 'starting' state) takes no args, so
    // route it through the same renderer on canvas.context.
    window.drawStartPlatform = function () {
      drawLandingPlatform(canvas.context);
    };
  }

  // Camera-lock flag flipped while the click-autoplay is running.
  var cameraLocked = false;
  var bgCloudOffset = 0;

  // ── Scroll-driven parallax ───────────────────────────────────────────────
  // Feeds camera.y so every parallax layer (stars, galaxy, clouds, logo,
  // platform) shifts at its own depth as the page scrolls. Only active in
  // the menu state — during gameplay the engine owns camera.y.
  var scrollOffsetY = 0;
  var SCROLL_PARALLAX_K = 0.1;

  function updateScrollOffset() {
    var bannerH = bannerEl.offsetHeight || 1;
    var sy = Math.max(0, Math.min(window.scrollY || window.pageYOffset || 0, bannerH));
    scrollOffsetY = -sy * SCROLL_PARALLAX_K;
  }
  window.addEventListener('scroll', updateScrollOffset, { passive: true });

  // ── Custom intro pan ──────────────────────────────────────────────────────
  // 6-second eased reveal with half the travel of the engine's built-in
  // menuStage 5 intro. Runs before we hand off to runGame.
  var intro = {
    active: true,
    progress: 0,
    camYStart: 0,
    offsetY: 0,
    duration: 360
  };
  var INTRO_DISTANCE = 0.5;

  // Persisted preference — unchecked means "skip the intro on reload".
  var INTRO_PREF_KEY = 'aibek_landing_intro';
  var introEnabled   = localStorage.getItem(INTRO_PREF_KEY) !== 'false';

  (function wireIntroToggle() {
    var el = document.getElementById('intro-toggle-input');
    if (!el) return;
    el.checked = introEnabled;
    el.addEventListener('change', function () {
      introEnabled = !!this.checked;
      try { localStorage.setItem(INTRO_PREF_KEY, introEnabled ? 'true' : 'false'); }
      catch (e) { /* storage may be disabled — preference stays session-local */ }
    });
  })();

  function startIntro() {
    if (!introEnabled) {
      // Skip — land directly on the settled menu scene.
      intro.active   = false;
      intro.progress = 1;
      intro.offsetY  = 0;
      camera.y  = scrollOffsetY;
      camera.vy = 0;
      camera.scrollY = 0;
      logo.alpha = 1;
      return;
    }
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

  // Combine the intro's camera offset with the scroll offset and propagate to
  // camera.vy / camera.scrollY so parallax layers that read those fields stay
  // in sync with the effective camera.y.
  function applyCameraParallax() {
    var prevY = camera.y;
    camera.y  = intro.offsetY + scrollOffsetY;
    camera.vy = camera.y - prevY;
    camera.scrollY += camera.vy;
  }

  // ── Intro render (used only while our custom intro is active) ────────────
  // Mirrors the rendering of runGame's 'gameMenu' case but gives us full
  // control of logo.alpha and the camera.y parallax offsets.
  function drawIntroFrame() {
    clear(canvas);
    canvas.context.save();
    canvas.context.scale(renderScale, renderScale);

    drawBackground();

    var cox = camera.offsetX;
    var coy = camera.offsetY;
    canvas.context.save();
    canvas.context.translate(cox, coy);
    canvas.context.beginPath();
    canvas.context.rect(0, 0, camera.width, camera.height);
    canvas.context.clip();

    var gctx = gameMenu.context;
    gctx.clearRect(0, 0, camera.width, camera.height);

    gctx.save();
    gctx.globalAlpha = logo.alpha;
    gctx.drawImage(logo.canvas, logo.posX, logo.posY + camera.y * parallax.logo);
    gctx.restore();

    drawPlatformScene(gctx, camera.y);

    var platScreenY = platform.posY + platform.hover + camera.y * parallax.platform;
    character.centerX = platform.posX + platform.width / 2;
    character.centerY = platScreenY + 26 - character.size / 2;
    drawCharacter(gctx);

    drawBackgroundClouds(canvas.context, true);
    canvas.context.drawImage(gameMenu.canvas, 0, 0);
    drawForeground(canvas.context, true);

    canvas.context.restore(); // clip
    canvas.context.restore(); // renderScale
  }

  // ── Click-to-play ─────────────────────────────────────────────────────────
  // Clicking the character while the menu is idle triggers the engine's
  // animateStart (the real menu→play transition) with autoplay enabled. The
  // engine's AI then grapples through a real level until the character dies,
  // at which point our game-over watchdog transitions back to the menu.
  function pageToCameraCoords(clientX, clientY) {
    var rect = canvasEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (camera.width  / rect.width),
      y: (clientY - rect.top)  * (camera.height / rect.height)
    };
  }

  function hitTestCharacter(cx, cy) {
    var r = character.size * 0.6;
    var dx = cx - character.centerX;
    var dy = cy - character.centerY;
    return (dx * dx + dy * dy) <= r * r;
  }

  // Combined platform + character bounding box, used for cursor hover.
  function hitTestPlatformArea(cx, cy) {
    // Platform rect (with hover bob), extended upward to include the
    // character standing on top.
    var top    = platform.posY + platform.hover - character.size;
    var bottom = platform.posY + platform.hover + platform.height;
    var left   = platform.posX;
    var right  = platform.posX + platform.width;
    return cx >= left && cx <= right && cy >= top && cy <= bottom;
  }

  // Only show the pointer cursor when the user can actually click something.
  canvasEl.addEventListener('mousemove', function (ev) {
    // No interaction while autoplay is running or during the intro.
    if (intro.active || gameState !== 'gameMenu') {
      if (canvasEl.style.cursor !== '') canvasEl.style.cursor = '';
      return;
    }
    var p = pageToCameraCoords(ev.clientX, ev.clientY);
    canvasEl.style.cursor = hitTestPlatformArea(p.x, p.y) ? 'pointer' : '';
  });
  canvasEl.addEventListener('mouseleave', function () {
    canvasEl.style.cursor = '';
  });

  console.log('[landing] registering click handler, canvas=', canvasEl);
  canvasEl.addEventListener('click', function (ev) {
    var p = pageToCameraCoords(ev.clientX, ev.clientY);
    var hit = hitTestCharacter(p.x, p.y);
    console.log('[landing] click cam=(' + Math.round(p.x) + ',' + Math.round(p.y) +
      ') char=(' + Math.round(character.centerX) + ',' + Math.round(character.centerY) +
      ') hit=' + hit + ' intro=' + intro.active + ' state=' + gameState);

    // If the intro is still running, a click anywhere in the banner skips it
    // — lets the user get to the interactive scene immediately.
    if (intro.active) {
      intro.progress = 1;
      intro.offsetY  = 0;
      intro.active   = false;
      logo.alpha     = 1;
      return;
    }

    if (gameState !== 'gameMenu') return;
    if (!hit) return;
    try {
      startClickAutoplay();
      console.log('[landing] startClickAutoplay ok, state=' + gameState);
    } catch (e) {
      console.error('[landing] startClickAutoplay threw:', e);
    }
  });

  // Mirrors the engine's animateStart (the real menu→play transition) but
  // locks the camera and skips state 1's pan so the scene stays centred on
  // the platform. State 2 (walk to platform edge) + state 3 (hop + attach
  // to first hook) run normally, so the character does the same walk/jump
  // you see at the start of a regular game.
  function startClickAutoplay() {
    camera.x  = 0;
    camera.vx = 0;
    camera.y  = scrollOffsetY;
    camera.vy = 0;

    var firstStarTarget = platform.posX + platform.width + 480;
    gameSetup(firstStarTarget);

    gameState = 'starting';
    hookAlpha = 1;

    var hoverY = platform.posY + platform.hover;
    character.centerX = platform.posX + platform.width / 2;
    character.centerY = hoverY + 26 - character.size / 2;

    // start-state bookkeeping (same fields animateStart writes)
    start.logoStartX     = (camera.width / 2) - (logo.width / 2);
    start.platformStartX = platform.posX;
    start.cameraStartX   = 0;
    start.targetCameraX  = 0; // camera locked — no pan to perform
    start.state          = 2; // skip state 1 (pan + logo fade); go straight to walk
    start.progress       = 0;
    start.logoAlpha      = 1;
    start.hopVY          = 0;
    start.hopping        = false;

    cameraLocked = true;
    console.log('[landing] startClickAutoplay: cameraLocked=true, camera.width=', camera.width,
      'logo.posX=', logo.posX, 'platform.posX=', platform.posX);

    // Stars invisible during walk, fade in starting at the jump.
    hookAlpha = 0;

    autoplay.enabled     = true;
    autoplay.waiting     = false;
    autoplay.detachAngle = null;
    autoplay.hasDetached = false;

    playDurationTimer = 0;
    offscreenTimer    = 0;
  }

  // Snap directly back to the menu — no animateGameOver, no menuAnimation,
  // no UI screens. Character lands back on the platform.
  function resetToMenu() {
    autoplay.enabled = false;
    autoplay.waiting = false;
    if (character.swinging) detach();

    clearVariables();

    // Reset fade-related state so the next click starts cleanly.
    hookAlpha = 1;
    if (gamePanel && gamePanel.context) gamePanel.context.globalAlpha = 1;

    cameraLocked = false;
    camera.x  = 0;
    camera.vx = 0;
    camera.y  = scrollOffsetY;
    camera.vy = 0;

    character.centerX = platform.posX + platform.width / 2;
    character.centerY = platform.posY + platform.hover + 26 - character.size / 2;

    gameState = 'gameMenu';
    playDurationTimer = 0;
    offscreenTimer    = 0;
  }

  // ── Watchdog ──────────────────────────────────────────────────────────────
  // Returns to the menu when autoplay leaves the screen or runs long.
  var playDurationTimer = 0;
  var offscreenTimer    = 0;
  var MAX_PLAY_SECONDS  = 14;
  var OFFSCREEN_HOLD    = 48; // ~0.8s off-screen before reset

  function tickGameOverWatchdog() {
    if (gameState !== 'playGame') {
      playDurationTimer = 0;
      offscreenTimer    = 0;
      return;
    }

    playDurationTimer += dt;

    var outsideX = character.centerX < -80 || character.centerX > camera.width + 80;
    var outsideY = character.centerY < -120 || character.centerY > camera.height + 80;
    if (outsideX || outsideY) {
      offscreenTimer += dt;
      if (offscreenTimer > OFFSCREEN_HOLD) {
        resetToMenu();
        return;
      }
    } else {
      offscreenTimer = 0;
    }

    if (playDurationTimer > 60 * MAX_PLAY_SECONDS) {
      resetToMenu();
    }
  }

  // ── Runtime patching: wrap runGame for per-frame hooks ───────────────────
  // Applies scroll parallax while on the menu, and runs the game-over
  // watchdog. runGame schedules its own RAF, so we just replace the global.
  function wrapRunGame() {
    var origRunGame = runGame;
    var dbgFrame = 0;
    var HOOK_FADE_RATE = 0.05; // 1/20 frames ≈ 0.33s
    window.runGame = function (timestamp) {
      if (gameState === 'gameMenu') {
        // Rebase camera.y onto scroll (intro has already ended).
        intro.offsetY = 0;
        applyCameraParallax();
      }
      // Feed hookAlpha into gamePanel so it fades during 'playGame'. The
      // engine already applies hookAlpha on canvas.context during 'starting',
      // so we leave gamePanel's alpha at 1 in that state.
      if (gamePanel && gamePanel.context) {
        gamePanel.context.globalAlpha = (gameState === 'playGame') ? hookAlpha : 1;
      }
      origRunGame(timestamp);
      // dt is fresh now (origRunGame calculated it); watchdog can use it.
      tickGameOverWatchdog();

      // Fade in the stars once the character jumps (starting state 3), and
      // keep filling in during the first frames of real gameplay.
      var jumping = (gameState === 'starting' && typeof start !== 'undefined' && start.state === 3);
      if ((jumping || gameState === 'playGame') && hookAlpha < 1) {
        hookAlpha = Math.min(1, hookAlpha + HOOK_FADE_RATE * dt);
      }
      // One-shot log each time we change gameState, plus every ~60 frames
      // while in playGame so we can see camera drift if any.
      if (gameState === 'playGame' && ((dbgFrame++) % 60 === 0)) {
        console.log('[landing] playGame frame', dbgFrame,
          'camera.x=', Math.round(camera.x),
          'camera.y=', Math.round(camera.y),
          'camera.width=', camera.width,
          'logo.posX=', logo.posX,
          'char=(' + Math.round(character.centerX) + ',' + Math.round(character.centerY) + ')');
      }
    };
  }

  // ── Intro RAF (used only until the intro finishes) ───────────────────────
  // Once intro.active flips to false, we hand off the RAF to the engine by
  // calling runGame once — it re-schedules itself from there.
  function runIntroLoop(timestamp) {
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    var elapsed = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    dt = (elapsed > 0 && elapsed < 200) ? elapsed / targetFrameMs : 1;

    tickIntro();
    applyCameraParallax();
    drawIntroFrame();

    if (intro.active) {
      requestAnimationFrame(runIntroLoop);
    } else {
      // Reset camera.vy so the engine doesn't inherit our accumulated drift.
      camera.vy = 0;
      wrapRunGame();
      requestAnimationFrame(runGame);
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  // Banner aspect changes with window width. Rebuild tile canvases so stars
  // and clouds keep covering the new camera dims. Only safe while on the
  // menu — gameplay state has live physics and chunk data.
  //
  // setupForeground() pushes onto backgroundClouds/smallClouds/tinyClouds
  // without clearing them first, so each resize would otherwise stack more
  // cloud instances on top of the old ones. Reset them here before rebuild.
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (gameState !== 'gameMenu') return;
      setupLandingCanvas();
      setupBackground();
      backgroundClouds.length = 0;
      smallClouds.length = 0;
      tinyClouds.length = 0;
      setupForeground();
      repositionMenuElements();
    }, 120);
  });

  // ── Go ────────────────────────────────────────────────────────────────────
  setupScene();
  applyEnginePatches();

  // Give createLogo a frame to load its SVG (async image), then prime state
  // and kick off the appropriate loop. If the user disabled the intro we
  // skip straight to runGame; otherwise the intro loop animates the pan and
  // hands off when it finishes.
  requestAnimationFrame(function () {
    repositionMenuElements();
    updateScrollOffset();
    startIntro();
    if (intro.active) {
      requestAnimationFrame(runIntroLoop);
    } else {
      wrapRunGame();
      requestAnimationFrame(runGame);
    }
  });

})();
