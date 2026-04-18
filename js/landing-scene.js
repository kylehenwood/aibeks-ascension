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
      var landY = platScreenY + 26 - character.size / 2;

      if (fallingBackToMenu) {
        // Spawned above camera, gravity pulls character onto the platform.
        physics.vy += physics.GRAVITY * dt;
        character.centerY += physics.vy * dt;
        character.centerX = platform.posX + platform.width / 2;
        if (character.centerY >= landY) {
          character.centerY = landY;
          physics.vy = 0;
          fallingBackToMenu = false;
        }
      } else {
        character.centerX = platform.posX + platform.width / 2;
        character.centerY = landY;
      }

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

    // 6. Intercept the game-over trigger. The engine fires this when the
    //    character falls past the canvas bottom — fade the stars out first,
    //    then map to our fall-back-to-platform animation (no game-over
    //    screen, no death animation).
    window.setupGameOverAnimation = function () {
      beginHookFadeOut(fallBackToPlatform);
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

    // 7d. Sequential, directional star-picker. starHooks are sorted by posX
    //     post-`sortAndReindex`, so index ascending == left-to-right in world
    //     space. `jumpDirection` (±1) steps the index outward from platform.
    //     First pick starts at `landingPlatformIndex` (rightward) or
    //     `landingPlatformIndex - 1` (leftward).
    // A star is "grappable" only if it's alive AND not in its death
    // animation (dying stars have alive === true but render as a red
    // supernova — visually dead).
    function hookIsGrappable(h) {
      return h.star.alive && !h.star.dying;
    }

    function pickNextDirectionalHook() {
      var idx;
      if (autoplay.lastHook && autoplay.lastHook.star) {
        idx = autoplay.lastHook.star.index + jumpDirection;
      } else {
        idx = (jumpDirection > 0) ? landingPlatformIndex : landingPlatformIndex - 1;
      }
      while (idx >= 0 && idx < starHooks.length) {
        if (hookIsGrappable(starHooks[idx])) {
          if (Math.abs(starHooks[idx].centerX - character.centerX) > MAX_GRAPPLE_DX) return null;
          return starHooks[idx];
        }
        idx += jumpDirection;
      }
      return null;
    }

    // Release-mode detach: each grapple rolls 1 or 2 swings. Release fires
    // on a forward crossing of the "lower-45°" rope angle on the FORWARD
    // side of the hook (right of hook for rightward, left of hook for
    // leftward), but only after the character has travelled ≥ π radians of
    // arc cumulatively — so every grapple is held for at least a half-period.
    //
    // Rope angle = atan2(char.y - hook.y, char.x - hook.x):
    //   0    = rope horizontal right (char directly right of hook)
    //   π/4  = below-right of hook at 45° (the rightward release target)
    //   π/2  = rope vertical (char directly below hook, bottom of arc)
    //   3π/4 = below-left of hook at 45° (the leftward release target)
    //   π    = rope horizontal left
    window.autoplayDetach = function () {
      if (!physics.ropeActive || !selectedHook) return;
      if (autoplay.hasDetached) return;

      if (selectedHook !== lastSelectedHook) {
        lastSelectedHook = selectedHook;
        swingCount       = 0;
        targetSwings     = Math.random() < 0.5 ? 1 : 2;
        prevRopeAngle    = null;
        arcTravel        = 0;
      }

      var rope = physics.rope;
      if (!rope || rope.length < 2) return;
      var hook = rope[0];
      var last = rope[rope.length - 1];
      var angle = Math.atan2(last.y - hook.y, last.x - hook.x);

      if (prevRopeAngle !== null) {
        var rawDelta = angle - prevRopeAngle;
        var delta = rawDelta;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        arcTravel += Math.abs(delta);

        // atan2 wraps at ±π: a high-energy swing that passes over the top
        // of the hook produces a raw-delta of ~±2π, which the naive
        // crossing check below misreads as "crossed π/4 downward" and
        // fires a detach at whatever angle the wrap happened to land on.
        // Skip the crossing check on those frames — the unwrapped delta
        // shows the real motion was tiny, not a legitimate target crossing.
        var wrapped = Math.abs(rawDelta) > Math.PI;

        if (!wrapped && arcTravel >= MIN_ARC_TRAVEL) {
          var target = (jumpDirection > 0) ? (Math.PI / 4) : (3 * Math.PI / 4);
          // Rightward: target is on the ascending-right side of the arc,
          // so angle is DECREASING through it (π/2 → 0). Leftward: target
          // is on the ascending-left side, angle INCREASING (π/2 → π).
          var crossed = (jumpDirection > 0)
            ? (prevRopeAngle > target && angle <= target)
            : (prevRopeAngle < target && angle >= target);
          if (crossed) {
            swingCount++;
            if (swingCount >= targetSwings) {
              autoplay.lastHook = selectedHook;
              detach();
              autoplay.hasDetached = true;
              autoplay.waiting = true;
            }
          }
        }
      }
      prevRopeAngle = angle;
    };

    // After detach, find the next star in direction order.
    window.autoplayAttach = function () {
      if (character.swinging) return;
      var target = pickNextDirectionalHook();
      if (target) {
        changeHook(target.star.index);
        autoplay.waiting = false;
        autoplay.detachAngle = null;
        autoplay.hasDetached = false;
      }
    };

    // 7e. Directional walk + hop. animation-toplay.js's state 2 walks to
    //     the platform's right edge and state 3 hops at vx=+1.5 — hard-coded
    //     rightward. Replace with a direction-aware version.
    window.updateStart = function () {
      var context = canvas.context;

      if (platform.hoverDirection === 'up'   && platform.hover <= 0) platform.hoverDirection = 'down';
      if (platform.hoverDirection === 'down' && platform.hover >= 5) platform.hoverDirection = 'up';
      if (platform.hoverDirection === 'up') platform.hover -= 0.024 * dt;
      else                                   platform.hover += 0.024 * dt;
      platform.time += 0.016 * dt;

      if (start.state === 2) {
        start.progress += 0.02 * dt;
        if (start.progress > 1) start.progress = 1;
        var t = start.progress;
        var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        var platScreenX = start.platformStartX + camera.x * start.platformParallax;
        var walkStartX = platScreenX + platform.width / 2;
        var walkEndX = (jumpDirection > 0)
          ? platScreenX + platform.width - character.size / 2 - 8
          : platScreenX + character.size / 2 + 8;
        character.centerX = walkStartX + (walkEndX - walkStartX) * ease;
        var hoverY = platform.posY + platform.hover;
        character.centerY = hoverY + 26 - character.size / 2;
        drawCharacter(context);
        if (start.progress >= 1) {
          start.state = 3;
          start.progress = 0;
          start.hopVY = -4;
          start.hopping = true;
          start.hopStartX = character.centerX;
        }
      }
      else if (start.state === 3) {
        if (start.hopping) {
          start.hopVY += 0.25 * dt;
          character.centerY += start.hopVY * dt;
          character.centerX += 1.5 * jumpDirection * dt;
          drawCharacter(context);
          if (start.hopVY > 0.5) {
            start.hopping = false;
            start.platformExiting = true;
            character.centerX = character.centerX - camera.x;
            physics.vx = 1.5 * jumpDirection;
            physics.vy = start.hopVY;
            startGame();
          }
        }
      }
    };

    // 7f. Directional first grapple. engine's startGame picks the star
    //     closest to screen-center — for us the platform is near centre
    //     so that tends to pick a near-platform star regardless of side.
    //     Pick the first alive star in the chosen direction instead.
    window.startGame = function () {
      gameState = 'playGame';
      hookAlpha = 1;
      physics.vx = 0;
      physics.vy = 0;

      var idx = (jumpDirection > 0) ? landingPlatformIndex : landingPlatformIndex - 1;
      while (idx >= 0 && idx < starHooks.length) {
        if (hookIsGrappable(starHooks[idx])) {
          if (Math.abs(starHooks[idx].centerX - character.centerX) > MAX_GRAPPLE_DX) break;
          infiniteGen.startX = starHooks[idx].centerX;
          infiniteGen.maxDistance = 0;
          starImmunity.immune = true;
          changeHook(idx);
          return;
        }
        idx += jumpDirection;
      }
      // No reachable star in direction — watchdog will reset to menu shortly.
    };

    // 7c. Shift every star 120px lower on the canvas. Stars are positioned
    //     through gridPosAt by both chunkManager.generateChunk and the
    //     overlap check, so patching this helper keeps the layout consistent.
    window.gridPosAt = function (col, row) {
      return {
        positionX: gridBaseX + col * gridSize.square,
        positionY: row * gridSize.square + 120
      };
    };

    // 7d. Replace drawShootingStarHooks with a version that fades the star
    //     (and its trail) in at the start of each cycle and out at the end,
    //     so the spawn/despawn don't pop visually.
    window.drawShootingStarHooks = function (context) {
      var FADE_WINDOW = 0.20; // fraction of cycle used for fade-in / fade-out
      for (var i = 0; i < shootingStarHooks.length; i++) {
        var ss = shootingStarHooks[i];
        var t  = ss.progress;
        var remaining = 1 - t;

        // Envelope: ramp up 0→20%, hold, ramp down 80→100%.
        var fadeIn  = Math.min(t        / FADE_WINDOW, 1);
        var fadeOut = Math.min(remaining / FADE_WINDOW, 1);
        var envelope = Math.min(fadeIn, fadeOut);

        // Trail particles — gate per-particle alpha on the envelope as well.
        for (var j = 0; j < ss.trail.length; j++) {
          var p = ss.trail[j];
          if (p.life <= 0) continue;
          var pt = p.life / p.maxLife;
          var alpha = pt * pt * 0.4 * envelope;
          if (alpha < 0.005) continue;
          context.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
          context.beginPath();
          context.arc(p.x, p.y, p.size * pt, 0, Math.PI * 2);
          context.fill();
        }

        // Redraw the hook canvas — centre dot + ring + progress arc, all
        // multiplied by the envelope.
        var hookCtx = ss.hook.context;
        var star = ss.hook.star;
        hookCtx.clearRect(0, 0, 64, 64);

        var dotAlpha = remaining * envelope;
        if (dotAlpha > 0.01) {
          hookCtx.beginPath();
          hookCtx.arc(32, 32, star.size, 0, Math.PI * 2);
          hookCtx.fillStyle = 'rgba(255, 255, 255, ' + dotAlpha + ')';
          hookCtx.fill();
        }

        hookCtx.beginPath();
        hookCtx.lineWidth = 1.5;
        hookCtx.strokeStyle = 'rgba(255, 200, 0, ' + (0.7 * envelope) + ')';
        hookCtx.arc(32, 32, star.size + star.strokeOffset, 0, Math.PI * 2);
        hookCtx.stroke();

        var startAngle = -Math.PI / 2;
        var endAngle   = startAngle + remaining * Math.PI * 2;
        hookCtx.beginPath();
        hookCtx.lineWidth = 3;
        hookCtx.strokeStyle = 'rgba(255, 200, 0, ' + (0.8 * envelope) + ')';
        hookCtx.arc(32, 32, star.size + star.strokeOffset, startAngle, endAngle);
        hookCtx.stroke();
      }
    };

    // 7g. Reject star positions that intersect the logo's rect (plus padding).
    //     starOverlaps is consulted during chunk generation for every candidate
    //     position, so wrapping it prunes logo-occluded slots from the layout.
    var origStarOverlaps = window.starOverlaps;
    var LOGO_STAR_PADDING = 24;
    window.starOverlaps = function (posX, posY) {
      if (origStarOverlaps(posX, posY)) return true;
      var starSize = 64;
      var lx = logo.posX - LOGO_STAR_PADDING;
      var ly = logo.posY - LOGO_STAR_PADDING;
      var lw = logo.width + LOGO_STAR_PADDING * 2;
      var lh = logo.height + LOGO_STAR_PADDING * 2;
      if (posX + starSize > lx && posX < lx + lw &&
          posY + starSize > ly && posY < ly + lh) {
        return true;
      }
      return false;
    };

    // 7h. Wider FIRST gap only — keep the standard chunk gaps (5-7 cols) for
    //     the bulk of the level but push the innermost star of chunk 0 (to
    //     the right of the platform) and chunk -1 (to the left) further out,
    //     so the character has a cleaner first grapple after the hop.
    var FIRST_GAP_EXTRA_COLS = 10;
    chunkManager.generateChunk = function (chunkIndex) {
      var rng = mulberry32(this.baseSeed + chunkIndex * 31337);
      var chunkStartCol = chunkIndex * this.CHUNK_COLS;
      var chunkEndCol = chunkStartCol + this.CHUNK_COLS;
      var safeStart = chunkStartCol + this.EDGE_BUFFER;
      var safeEnd = chunkEndCol - this.EDGE_BUFFER;

      // Pull the chunk's platform-adjacent edge further from the platform.
      if (chunkIndex === 0)  safeStart += FIRST_GAP_EXTRA_COLS;
      if (chunkIndex === -1) safeEnd   -= FIRST_GAP_EXTRA_COLS;

      var minColGap = 5;
      var maxColGap = 7;

      var col = safeStart;
      var isFirstEver = (chunkIndex === 0 && starHooks.length === 0);

      while (col < safeEnd) {
        col += seededRand(rng, minColGap, maxColGap);
        if (col >= safeEnd) break;

        var row;
        if (isFirstEver) {
          row = 1;
          isFirstEver = false;
        } else {
          row = seededRand(rng, 0, gridSize.rows - 1);
          var placed = false;
          for (var attempt = 0; attempt < gridSize.rows; attempt++) {
            var testRow = (row + attempt) % gridSize.rows;
            var pos = gridPosAt(col, testRow);
            if (!starOverlaps(pos.positionX, pos.positionY)) {
              row = testRow;
              placed = true;
              break;
            }
          }
          if (!placed) continue;
        }

        var pos = gridPosAt(col, row);
        if (!starOverlaps(pos.positionX, pos.positionY)) {
          createHook(col, row, false, chunkIndex);
        }
      }
    };

    // 7i. Cinematic tuning for the landing scene — the engine runs at a
    //     play-first cadence; we dial these back so the autoplay reads
    //     more clearly against the logo. These writes only affect the
    //     landing page because it never hands off to the real game loop.
    physics.GRAVITY         = 0.3;  // ~25% slower swings (default 0.4)
    physics.ROPE_MIN_LENGTH = 40;   // short minimum rope (default 80)
    character.grappelDelay  = 320;  // 2× grapple delay + travel time (default 160)

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

  // Fall-back-to-platform state: when autoplay fails (character falls off
  // the bottom of the canvas), we wait 2s (character gone offscreen) then
  // respawn them above the canvas over the platform and let gravity land
  // them back on it before returning to idle.
  var fallingBackToMenu = false;
  var fallBackPending   = false; // true while 2s respawn timer is counting down

  // Direction of the current run: +1 jumps right (stars +1, +2, +3 …),
  // -1 jumps left (stars -1, -2, -3 …). Platform is index "0" — we place
  // stars on both sides of it and sort by posX so the engine's internal
  // starHooks[i].star.index is the world-space left-to-right index.
  // `landingPlatformIndex` is the boundary: stars with index >= it are
  // on the right, strictly less are on the left.
  var jumpDirection = 1;
  var landingPlatformIndex = 0;

  // Per-grapple swing state: roll 1 or 2 target swings on attach, track
  // cumulative arc travel, and require ≥ π radians travelled before the
  // next forward crossing of the "lower 45°" rope angle can release.
  var lastSelectedHook = null;
  var swingCount       = 0;
  var targetSwings     = 1;
  var prevRopeAngle    = null;
  var arcTravel        = 0;
  var MIN_ARC_TRAVEL   = Math.PI;  // 180°

  // Cap on how far a single grapple can reach horizontally. Keeps swings
  // tight and readable; if the next in-sequence star is farther than this,
  // no grapple fires and the character falls (Y-axis watchdog handles it).
  var MAX_GRAPPLE_DX = 320;

  // Hand-placed mirrored layout: a handful of right-side stars at pixel
  // offsets from the platform centre, with the outermost star beyond the
  // canvas edge so the character has something to grapple as they swing
  // offscreen before the wrap-around. Then mirror the set across the
  // platform-centre axis so the left side matches exactly.
  function setupLandingLevel() {
    var sq = gridSize.square;
    var rows = gridSize.rows;
    gridBaseX = Math.round((platform.posX + platform.width / 2) / sq) * sq;

    chunkManager.reset();

    var rng = mulberry32(Math.floor(Math.random() * 2147483647));
    var halfCanvas = camera.width / 2;

    // Pixel offsets from the mirror axis (gridBaseX). The last entry is
    // intentionally past the edge (>halfCanvas) — that's the "one offscreen
    // on either side" star.
    var offsets = [
      halfCanvas * 0.30,
      halfCanvas * 0.55,
      halfCanvas * 0.85,
      halfCanvas * 1.18
    ];

    // Bias initial stars toward the lower half of the grid so the first
    // grapples read naturally from the platform's height. We pick a starting
    // row in [MIN_ROW, rows-1] and still iterate the full range as a fallback
    // in case lower rows overlap.
    var MIN_ROW = Math.floor(rows / 2); // rows 5..9 for rows=10

    for (var i = 0; i < offsets.length; i++) {
      var worldX = gridBaseX + offsets[i];
      var rowStart = MIN_ROW + Math.floor(rng() * (rows - MIN_ROW));
      for (var attempt = 0; attempt < rows; attempt++) {
        var row = (rowStart + attempt) % rows;
        var worldY = row * sq + 120 + 32;
        if (!starOverlaps(worldX - 32, worldY - 32)) {
          createStarAtWorld(worldX, worldY, false);
          break;
        }
      }
    }

    // Mirror each right-side star to the left across gridBaseX.
    var rightStars = starHooks.slice();
    for (var i = 0; i < rightStars.length; i++) {
      var rs = rightStars[i];
      createStarAtWorld(2 * gridBaseX - rs.centerX, rs.centerY, rs.star.safe);
    }

    // Replace one of the right-side stars with a shooting star. Pick the
    // star nearest the middle of the right cluster so it's visible on most
    // banner widths, then swap in a shooting star at the same position.
    replaceStarWithShooting();

    // Mark nearby chunks as "loaded" so ensureChunks doesn't regenerate
    // stars on top of the hand-placed layout once playGame starts.
    for (var ci = -5; ci <= 5; ci++) {
      chunkManager.loadedChunks[ci] = { generated: true };
    }

    chunkManager.sortAndReindex();
    drawClicky();
  }

  // Pick a right-side star and swap it for a shooting star at the same
  // world position. Shooting stars animate diagonally within a square grid
  // region; we use an 8-cell span and nudge its origin down by the +120 Y
  // shift the rest of the landing layout uses.
  function replaceStarWithShooting() {
    var sq = gridSize.square;

    // Choose target: the 2nd star strictly to the right of gridBaseX (i.e.,
    // the 2nd-out star on the right side). Indices may span multiple chunks
    // but the mirror layout keeps them sorted left→right.
    var platAxis = gridBaseX;
    var rightStars = [];
    for (var i = 0; i < starHooks.length; i++) {
      if (starHooks[i].centerX > platAxis + 40) rightStars.push(i);
    }
    if (rightStars.length < 2) return;
    var victimIdx = rightStars[1]; // 2nd-out right-side star
    var victim = starHooks[victimIdx];
    var worldX = victim.centerX;
    var worldY = victim.centerY;

    // Remove the victim (from starHooks AND its paired element entry).
    starHooks.splice(victimIdx, 1);
    for (var j = elements.length - 1; j >= 0; j--) {
      var elCenterX = elements[j].posX + elements[j].size / 2;
      var elCenterY = elements[j].posY + elements[j].size / 2;
      if (Math.abs(elCenterX - worldX) < 48 && Math.abs(elCenterY - worldY) < 48) {
        elements.splice(j, 1);
        break;
      }
    }

    // Spawn a shooting star whose region centres on the removed star's
    // world position. createShootingStar uses `originY = row * sq` — that
    // doesn't honour our +120 Y shift, so we nudge the result ourselves.
    var span       = 8;
    var regionSize = span * sq;
    var col = Math.round((worldX - regionSize / 2 - gridBaseX) / sq);
    var row = Math.round((worldY - regionSize / 2 - 120) / sq);
    var ss  = createShootingStar(col, row, span);
    if (!ss) return;

    ss.originY         += 120;
    ss.hook.posY       += 120;
    ss.hook.centerY    += 120;
    // createShootingStar pushed an element for its region last — shift it.
    var e = elements[elements.length - 1];
    if (e) e.posY += 120;
  }

  // After all chunks are loaded + reindexed by posX, find the boundary
  // index: stars with index < this are left of platform, >= are right.
  function computeLandingPlatformIndex() {
    var platX = platform.posX + platform.width / 2;
    landingPlatformIndex = 0;
    for (var i = 0; i < starHooks.length; i++) {
      if (starHooks[i].centerX < platX) landingPlatformIndex++;
      else break;
    }
  }

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
    // No interaction while autoplay is running, during the intro, or
    // while the character is falling back onto the platform.
    if (intro.active || gameState !== 'gameMenu' || fallingBackToMenu) {
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
    if (fallingBackToMenu) return;
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

    jumpDirection = Math.random() < 0.5 ? -1 : 1;

    // Nuke any shooting stars that survived a previous run before we rebuild
    // the level (clearVariables only touches starHooks).
    if (typeof removeAllShootingStars === 'function') removeAllShootingStars();
    else if (typeof shootingStarHooks !== 'undefined') shootingStarHooks.length = 0;

    setupLandingLevel();
    computeLandingPlatformIndex();

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

    // Stars invisible during walk, fade in starting at the jump.
    hookAlpha = 0;
    fadingOutHooks = false;
    fadeOutCallback = null;

    // Release mode with a custom detach trigger — see override in
    // applyEnginePatches. Engine's default release mode hard-codes
    // rightward-only gates; we replace both.
    autoplay.mode        = 'release';
    autoplay.enabled     = true;
    autoplay.waiting     = false;
    autoplay.detachAngle = null;
    autoplay.hasDetached = false;
    autoplay.lastHook    = null;
    lastSelectedHook     = null;

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
    // Shooting stars aren't owned by clearVariables — tear them down too so
    // their update ticks (and trail particles) don't persist into the menu.
    if (typeof removeAllShootingStars === 'function') removeAllShootingStars();
    else if (typeof shootingStarHooks !== 'undefined') shootingStarHooks.length = 0;

    // Reset fade-related state so the next click starts cleanly.
    hookAlpha = 1;
    fadingOutHooks = false;
    fadeOutCallback = null;
    if (gamePanel && gamePanel.context) gamePanel.context.globalAlpha = 1;

    jumpDirection = 1;

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
  // X-axis exits always wrap around — the scene loops forever. Only a
  // Y-axis exit (character fell off the bottom / went way above the top)
  // ends the run and resets to menu, as a safety bail-out.
  var playDurationTimer = 0;
  var offscreenTimer    = 0;
  var OFFSCREEN_HOLD    = 48; // ~0.8s off-screen before reset

  function teleportAndReturn() {
    if (character.swinging) detach();

    // Teleport to just offscreen on the opposite edge.
    character.centerX = (character.centerX > camera.width / 2) ? -30 : camera.width + 30;
    // Bring them back to roughly the upper playfield so they have room to swing.
    character.centerY = Math.min(Math.max(character.centerY, 80), camera.height - 240);

    physics.vx = 0;
    physics.vy = 0;

    // Direction stays — character continues in the same travel direction,
    // now re-entering the scene from the opposite edge and swinging back
    // across toward (and past) the platform.

    // Grapple the nearest alive onscreen star in the current direction so
    // the return swing starts visible, not with a giant offscreen rope.
    // Respect MAX_GRAPPLE_DX as well.
    var target = null;
    var bestDist = Infinity;
    for (var i = 0; i < starHooks.length; i++) {
      var h = starHooks[i];
      if (!h.star.alive || h.star.dying) continue;
      var dx = h.centerX - character.centerX;
      if (dx * jumpDirection <= 0) continue;
      if (h.centerX < 0 || h.centerX > camera.width) continue;
      var d = Math.abs(dx);
      if (d > MAX_GRAPPLE_DX) continue;
      if (d < bestDist) { bestDist = d; target = h; }
    }
    if (target) changeHook(target.star.index);

    autoplay.hasDetached = false;
    autoplay.waiting = false;
    lastSelectedHook = null;
    offscreenTimer = 0;
  }

  function tickGameOverWatchdog() {
    if (gameState !== 'playGame') {
      playDurationTimer = 0;
      offscreenTimer    = 0;
      return;
    }

    playDurationTimer += dt;

    var outsideX       = character.centerX < -80 || character.centerX > camera.width + 80;
    var belowCanvas    = character.centerY > camera.height + 80;

    // X-axis escape always wraps — unlimited loops. Going high above the
    // canvas during a swing is intentionally NOT a failure case; only a
    // true fall-off-the-bottom triggers the reset.
    if (outsideX && !belowCanvas) {
      teleportAndReturn();
      return;
    }

    // Fell off the bottom: fade the stars out, then respawn above canvas
    // over the platform and let gravity drop them back onto it.
    if (belowCanvas) {
      beginHookFadeOut(fallBackToPlatform);
    }
  }

  // ── Star fade-out on game-over / fall ────────────────────────────────────
  // When the run ends (either the engine's own game-over trigger or our
  // belowCanvas watchdog), we don't want the stars to simply blink off.
  // beginHookFadeOut ramps hookAlpha down in the RAF wrapper while a fixed
  // 2s wall-clock timer holds, then fires the queued reset callback — so
  // the respawn always lands at exactly 2s after the fall, regardless of
  // the fade's starting alpha or frame-rate.
  var fadingOutHooks  = false;
  var fadeOutCallback = null;
  var FALL_DELAY_MS   = 2000;

  function beginHookFadeOut(onDone) {
    if (fadingOutHooks) return; // already fading; ignore repeat triggers
    fadingOutHooks = true;
    fadeOutCallback = onDone || fallBackToPlatform;
    autoplay.enabled = false;
    autoplay.waiting = false;
    if (character.swinging) detach();
    setTimeout(function () {
      if (!fadingOutHooks) return;
      fadingOutHooks = false;
      var cb = fadeOutCallback;
      fadeOutCallback = null;
      if (cb) cb();
    }, FALL_DELAY_MS);
  }

  // Put the character above the camera at the platform's X, reset all
  // play-state, and let updateMenu's falling branch take over.
  function fallBackToPlatform() {
    if (character.swinging) detach();

    clearVariables();
    if (typeof removeAllShootingStars === 'function') removeAllShootingStars();
    else if (typeof shootingStarHooks !== 'undefined') shootingStarHooks.length = 0;

    hookAlpha = 1;
    fadingOutHooks = false;
    fadeOutCallback = null;
    if (gamePanel && gamePanel.context) gamePanel.context.globalAlpha = 1;

    autoplay.enabled     = false;
    autoplay.waiting     = false;
    autoplay.lastHook    = null;
    autoplay.hasDetached = false;
    lastSelectedHook     = null;

    jumpDirection = 1;

    cameraLocked = false;
    camera.x  = 0;
    camera.vx = 0;
    camera.y  = scrollOffsetY;
    camera.vy = 0;

    character.centerX = platform.posX + platform.width / 2;
    // Just above the canvas top — any higher and the invisible portion of
    // the fall eats most of the animation and reads as a teleport.
    character.centerY = -character.size;
    physics.vx = 0;
    physics.vy = 0;

    fallingBackToMenu = true;
    gameState = 'gameMenu';
    playDurationTimer = 0;
    offscreenTimer    = 0;
  }

  // ── Idle autoplay ────────────────────────────────────────────────────────
  // While the character sits idle on the platform, auto-trigger the same
  // sequence a click would after a random delay in [5s, 10s]. Any run
  // (user-click or auto) resets the timer.
  var idleTime         = 0;   // frames accumulated while idle on platform
  var idleTriggerAt    = -1;  // frames-from-now threshold; -1 = unscheduled
  var IDLE_DELAY_MIN    = 60 * 5;  // 5s
  var IDLE_DELAY_SPREAD = 60 * 5;  // + 0–5s random → [5s, 10s]

  function tickIdleAutoplay() {
    // Only count idle time when we're genuinely parked on the platform.
    if (intro.active ||
        gameState !== 'gameMenu' ||
        fallingBackToMenu ||
        fadingOutHooks) {
      idleTime = 0;
      idleTriggerAt = -1;
      return;
    }

    idleTime += dt;

    if (idleTriggerAt < 0) {
      idleTriggerAt = IDLE_DELAY_MIN + Math.random() * IDLE_DELAY_SPREAD;
    }

    if (idleTime >= idleTriggerAt) {
      idleTime = 0;
      idleTriggerAt = -1;
      startClickAutoplay();
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
      tickIdleAutoplay();

      // Fade in the stars once the character jumps (starting state 3), and
      // keep filling in during the first frames of real gameplay. The
      // fade-out path below overrides this when a run ends.
      var jumping = (gameState === 'starting' && typeof start !== 'undefined' && start.state === 3);
      if (!fadingOutHooks && (jumping || gameState === 'playGame') && hookAlpha < 1) {
        hookAlpha = Math.min(1, hookAlpha + HOOK_FADE_RATE * dt);
      }

      // Fade-out: driven by beginHookFadeOut(). Ramps hookAlpha down
      // visually. The respawn callback is fired on a fixed 2s setTimeout
      // inside beginHookFadeOut, independent of this frame-rate-sensitive
      // fade — so the fall→respawn cadence stays consistent.
      if (fadingOutHooks && hookAlpha > 0) {
        hookAlpha = Math.max(0, hookAlpha - HOOK_FADE_RATE * dt);
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
