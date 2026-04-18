// Shooting Star — a moving grapple star that animates diagonally
// within a square grid region. When it reaches the end, it respawns.
// The player can grapple to it like a normal star.

var shootingStarHooks = []; // array of active shooting star objects

function createShootingStar(col, row, gridSpan) {
  var span = gridSpan || 8; // default 8x8 grid cells
  var sq = gridSize.square;

  // World-space bounds of the region
  var originX = gridBaseX + col * sq;
  var originY = row * sq;
  var regionSize = span * sq;

  // Create a grapple hook for this shooting star
  var hookCanvas = document.createElement('canvas');
  hookCanvas.width = 64;
  hookCanvas.height = 64;
  var hookCtx = hookCanvas.getContext('2d');
  var hookPosition = starHooks.length;

  var star = {
    centerX: 32,
    centerY: 32,
    size: 6,
    strokeOffset: 16,
    bounds: 64,
    ring: 2,
    alive: true,
    safe: true,
    shooting: true,
    index: hookPosition
  };

  var hookSize = 64;
  var startX = originX;
  var startY = originY;

  var hook = {
    layer: hookCanvas,
    context: hookCtx,
    star: star,
    size: hookSize,
    selected: false,
    posX: startX,
    posY: startY,
    centerX: startX + hookSize / 2,
    centerY: startY + hookSize / 2,
    chunkIndex: -1 // not part of any chunk
  };

  starHooks.push(hook);
  drawHook(hook);

  // Click area — static region bounds, 1px inside the boundary
  elements.push({
    posX: originX + 1,
    posY: originY + 1,
    size: regionSize - 2,
    index: hookPosition,
    chunkIndex: -1
  });

  // Shooting star state
  var ss = {
    hook: hook,
    hookIndex: hookPosition,
    originX: originX,
    originY: originY,
    regionSize: regionSize,
    span: span,
    col: col,
    row: row,
    progress: 0,        // 0 → 1 as it crosses the region
    speed: 0.004,       // progress per frame (~250 frames to cross)
    trail: [],
    baseSize: 3         // starting head size for the trail/shrink effect
  };

  shootingStarHooks.push(ss);
  return ss;
}


function updateShootingStarHooks() {
  for (var i = 0; i < shootingStarHooks.length; i++) {
    var ss = shootingStarHooks[i];
    var hook = ss.hook;

    // Advance progress
    ss.progress += ss.speed * dt;
    if (ss.progress >= 1) {
      // Detach player if grappled to this shooting star
      if (selectedHook === hook) {
        detach();
      }
      ss.progress = 0;
      ss.trail = [];
    }

    var t = ss.progress; // 0 → 1

    // Position: diagonal from top-left to bottom-right of the region
    var worldX = ss.originX + t * ss.regionSize;
    var worldY = ss.originY + t * ss.regionSize;

    // Update hook position so the grapple system follows
    hook.posX = worldX - hook.size / 2;
    hook.posY = worldY - hook.size / 2;
    hook.centerX = worldX;
    hook.centerY = worldY;

    // Add trail particle (constant size)
    ss.trail.push({
      x: worldX,
      y: worldY,
      life: 30,
      maxLife: 30,
      size: ss.baseSize * 0.5
    });

    // Cap trail
    if (ss.trail.length > 40) ss.trail.shift();

    // Fade out old trail particles
    for (var j = ss.trail.length - 1; j >= 0; j--) {
      var p = ss.trail[j];
      p.life -= dt;
      if (p.life <= 0) {
        ss.trail.splice(j, 1);
      }
    }
  }
}


function drawShootingStarHooks(context) {
  for (var i = 0; i < shootingStarHooks.length; i++) {
    var ss = shootingStarHooks[i];
    var t = ss.progress;
    var remaining = 1 - t; // 1 at start, 0 at end

    // Fade in on spawn — quick ramp over first 5% of progress
    var fadeIn = Math.min(t / 0.05, 1);

    // Region outline is now drawn by the click area overlay in updateGame_sandbox

    // Draw trail (fading dot)
    for (var j = 0; j < ss.trail.length; j++) {
      var p = ss.trail[j];
      if (p.life <= 0) continue;
      var pt = p.life / p.maxLife;
      var alpha = pt * pt * 0.4;
      context.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
      context.beginPath();
      context.arc(p.x, p.y, p.size * pt, 0, Math.PI * 2);
      context.fill();
    }

    // Redraw the hook canvas
    var hookCtx = ss.hook.context;
    var star = ss.hook.star;
    hookCtx.clearRect(0, 0, 64, 64);

    // Center dot — always white, fades out as progress increases
    var dotAlpha = remaining * fadeIn;
    if (dotAlpha > 0.01) {
      hookCtx.beginPath();
      hookCtx.arc(32, 32, star.size, 0, Math.PI * 2);
      hookCtx.fillStyle = 'rgba(255, 255, 255, ' + dotAlpha + ')';
      hookCtx.fill();
    }

    // Outer ring — yellow to distinguish from static stars
    hookCtx.beginPath();
    hookCtx.lineWidth = 1.5;
    hookCtx.strokeStyle = 'rgba(255, 200, 0, ' + (0.7 * fadeIn) + ')';
    hookCtx.arc(32, 32, star.size + star.strokeOffset, 0, Math.PI * 2);
    hookCtx.stroke();

    // Progress arc — yellow, sweeps from full to empty as progress goes 0→1
    var startAngle = -Math.PI / 2;
    var endAngle = startAngle + remaining * Math.PI * 2;
    hookCtx.beginPath();
    hookCtx.lineWidth = 3;
    hookCtx.strokeStyle = 'rgba(255, 200, 0, ' + (0.8 * fadeIn) + ')';
    hookCtx.arc(32, 32, star.size + star.strokeOffset, startAngle, endAngle);
    hookCtx.stroke();
  }
}


function removeShootingStar(ss) {
  var idx = shootingStarHooks.indexOf(ss);
  if (idx !== -1) shootingStarHooks.splice(idx, 1);

  // Remove hook from starHooks
  var hookIdx = starHooks.indexOf(ss.hook);
  if (hookIdx !== -1) {
    starHooks.splice(hookIdx, 1);
    // Rebuild elements — shooting star hooks use their region bounds
    elements = [];
    for (var i = 0; i < starHooks.length; i++) {
      starHooks[i].star.index = i;
      var ssMeta = null;
      for (var j = 0; j < shootingStarHooks.length; j++) {
        if (shootingStarHooks[j].hook === starHooks[i]) { ssMeta = shootingStarHooks[j]; break; }
      }
      if (ssMeta) {
        elements.push({ posX: ssMeta.originX + 1, posY: ssMeta.originY + 1, size: ssMeta.regionSize - 2, index: i, chunkIndex: -1 });
      } else {
        var clickyBounds = 32;
        elements.push({ posX: starHooks[i].posX - clickyBounds, posY: starHooks[i].posY - clickyBounds, size: 64 + (clickyBounds * 2), index: i, chunkIndex: starHooks[i].chunkIndex || -1 });
      }
    }
    drawClicky();
  }
}


function removeAllShootingStars() {
  while (shootingStarHooks.length > 0) {
    removeShootingStar(shootingStarHooks[0]);
  }
}
