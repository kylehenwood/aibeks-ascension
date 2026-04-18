// Background star layers — created once, never regenerated
// Tiles infinitely based on camera position with parallax

var starLayers = [];
var twinkleStars = [];
var galaxyCanvas;
var galaxyBlur = parseFloat(localStorage.getItem('ss_galaxyBlur')) || 80;
var galaxyBorder = false;
var fgGalaxyInClouds = true;
var fgGalaxyUseBorder = false;

var fgGalaxyCanvas;
var fgGalaxyBlur = parseFloat(localStorage.getItem('ss_fgGalaxyBlur')) || 120;
var fgGalaxyOpacity = parseFloat(localStorage.getItem('ss_fgGalaxyOpacity'));
if (isNaN(fgGalaxyOpacity)) fgGalaxyOpacity = 1;

// ─── Shooting Stars ───────────────────────────────────────────────────────────

var shootingStars = [];
var shootingStarTimer = 0;
var shootingStarInterval = 300; // frames between spawn attempts (~5s at 60fps)
var shootingStarChance = 0.4;  // probability per interval
var bgShootingStarsEnabled = localStorage.getItem('ss_bgShootingStars') !== 'false'; // on by default

function spawnShootingStar() {
  // Start from a random position along the top or left edge
  var startX, startY;
  if (Math.random() < 0.6) {
    // Top edge — random X in first 60%
    startX = Math.random() * camera.width * 0.6;
    startY = -10;
  } else {
    // Left edge — random Y in first 40%
    startX = -10;
    startY = Math.random() * camera.height * 0.4;
  }

  // Travel direction: roughly top-left to bottom-right with some variance
  var angle = 0.6 + Math.random() * 0.4; // ~34° to ~57° from horizontal
  var speed = 4 + Math.random() * 4;     // 4-8 px/frame
  var vx = Math.cos(angle) * speed;
  var vy = Math.sin(angle) * speed;

  // Life = time to cross the diagonal of the camera
  var diagonal = Math.sqrt(camera.width * camera.width + camera.height * camera.height);
  var life = diagonal / speed;

  shootingStars.push({
    x: startX,
    y: startY,
    vx: vx,
    vy: vy,
    life: life,
    maxLife: life,
    size: 2.5 + Math.random() * 1.5, // 2.5-4px radius
    trail: []
  });
}

function updateShootingStars(ctx) {
  if (!bgShootingStarsEnabled) return;

  // Spawn timer
  shootingStarTimer += dt;
  if (shootingStarTimer >= shootingStarInterval) {
    shootingStarTimer = 0;
    if (Math.random() < shootingStarChance) {
      spawnShootingStar();
    }
  }

  for (var i = shootingStars.length - 1; i >= 0; i--) {
    var s = shootingStars[i];
    s.life -= dt;
    if (s.life <= 0) {
      shootingStars.splice(i, 1);
      continue;
    }

    // Move
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    var t = s.life / s.maxLife; // 1 → 0 as it completes

    // Add trail particle
    s.trail.push({
      x: s.x,
      y: s.y,
      life: 20, // frames
      maxLife: 20,
      size: s.size * t * 0.6
    });

    // Cap trail length
    if (s.trail.length > 30) s.trail.shift();

    // Draw trail particles
    for (var j = s.trail.length - 1; j >= 0; j--) {
      var p = s.trail[j];
      p.life -= dt;
      if (p.life <= 0) {
        s.trail.splice(j, 1);
        continue;
      }
      var pt = p.life / p.maxLife;
      var alpha = pt * pt * 0.5;
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pt, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw the head — shrinks as life decreases
    var headSize = s.size * t;
    var headAlpha = Math.min(t * 2, 1); // fade in quickly, fade out at end
    ctx.fillStyle = 'rgba(255, 255, 255, ' + headAlpha + ')';
    ctx.beginPath();
    ctx.arc(s.x, s.y, headSize, 0, Math.PI * 2);
    ctx.fill();

    // Bright core
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (headAlpha * 0.8) + ')';
    ctx.beginPath();
    ctx.arc(s.x, s.y, headSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}


function setupBackground() {
  createGalaxyLayer();
  createForegroundGalaxy();
  setupBackgroundStars();
}

function drawBackground() {
  // Gradient sky — deep navy to indigo/purple (fills entire canvas)
  var ctx = canvas.context;
  var grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#0a0a2e');
  grad.addColorStop(1, '#1e0a3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGalaxyLayer();
  drawBackgroundStars();
  updateShootingStars(ctx);
}

// Stored blob positions so we can regenerate with different blur
var galaxyBlobs = [];

function createGalaxyBlobs() {
  var gw = camera.width * 2;
  var gh = camera.height * 2;
  var maxRadius = 240;
  galaxyBlobs = [];
  var blobCount = 5 + rand(0, 4);
  for (var i = 0; i < blobCount; i++) {
    var radius = rand(100, maxRadius);
    // Inset by radius + max blur margin so nothing bleeds past edges (tileable)
    var margin = radius + Math.max(galaxyBlur, fgGalaxyBlur);
    galaxyBlobs.push({
      x: rand(margin, gw - margin),
      y: rand(margin, gh - margin),
      radius: radius
    });
  }
}

function createGalaxyLayer() {
  var gw = camera.width * 2;
  var gh = camera.height * 2;

  galaxyCanvas = document.createElement('canvas');
  galaxyCanvas.width = gw;
  galaxyCanvas.height = gh;
  var ctx = galaxyCanvas.getContext('2d');

  // Generate blob positions on first call
  if (galaxyBlobs.length === 0) {
    createGalaxyBlobs();
  }

  // Apply blur filter if set
  if (galaxyBlur > 0) {
    ctx.filter = 'blur(' + galaxyBlur + 'px)';
  }

  // Draw solid white circles
  ctx.fillStyle = 'rgba(120, 80, 200, 0.14)';
  for (var i = 0; i < galaxyBlobs.length; i++) {
    var b = galaxyBlobs[i];
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.filter = 'none';
}

// Shared tiling helper — draws a galaxy canvas with overlap and optional debug border
function tileGalaxy(targetCtx, galaxyImg, blur, vw, vh) {
  var gw = galaxyImg.width;
  var gh = galaxyImg.height;
  var stepX = gw - blur;
  var stepY = gh - blur;
  var depth = parallax.galaxy;
  var offsetX = camera.scrollX * depth - (gw - vw) / 2;
  var offsetY = camera.scrollY * depth - (gh - vh) / 2;
  var tileX = ((offsetX % stepX) + stepX) % stepX;
  var tileY = ((offsetY % stepY) + stepY) % stepY;

  for (var tx = -1; tx <= 1; tx++) {
    for (var ty = -1; ty <= 1; ty++) {
      var drawX = tileX + tx * stepX;
      var drawY = tileY + ty * stepY;
      if (drawX + gw > 0 && drawX < vw && drawY + gh > 0 && drawY < vh) {
        targetCtx.drawImage(galaxyImg, drawX, drawY);
        if (galaxyBorder) {
          targetCtx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
          targetCtx.lineWidth = 2;
          targetCtx.strokeRect(drawX, drawY, gw, gh);
        }
      }
    }
  }
}

// Draw background galaxy (white blobs behind stars)
function drawGalaxyLayer() {
  tileGalaxy(canvas.context, galaxyCanvas, galaxyBlur, canvas.width, canvas.height);
}

// Draw background galaxy onto an arbitrary context (for cloud masking — currently unused)
function drawGalaxyToContext(ctx, w, h) {
  tileGalaxy(ctx, galaxyCanvas, galaxyBlur, w, h);
}

// Draw foreground galaxy (green blobs) onto an arbitrary context
function drawFgGalaxyToContext(ctx, w, h) {
  tileGalaxy(ctx, fgGalaxyCanvas, fgGalaxyBlur, w, h);
}

// Create the foreground galaxy — same blob layout, bright green
function createForegroundGalaxy() {
  var gw = camera.width * 2;
  var gh = camera.height * 2;

  fgGalaxyCanvas = document.createElement('canvas');
  fgGalaxyCanvas.width = gw;
  fgGalaxyCanvas.height = gh;
  var ctx = fgGalaxyCanvas.getContext('2d');

  // Generate blob positions if not yet created
  if (galaxyBlobs.length === 0) {
    createGalaxyBlobs();
  }

  if (fgGalaxyBlur > 0) {
    ctx.filter = 'blur(' + fgGalaxyBlur + 'px)';
  }

  ctx.fillStyle = 'rgba(0, 255, 50, ' + fgGalaxyOpacity + ')';
  for (var i = 0; i < galaxyBlobs.length; i++) {
    var b = galaxyBlobs[i];
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.filter = 'none';
}

function createStarPanel(density, size) {
  var panel = document.createElement('canvas');
  panel.width = camera.width;
  panel.height = camera.height;
  panel.context = panel.getContext('2d');

  var area = (camera.width * camera.height) / (40 * 40);
  var starCount = area * density;
  var starColor = 'rgba(255, 255, 255, 0.3)';

  for (var i = 0; i < starCount; i++) {
    var starX = rand((size / 2), camera.width - (size / 2));
    var starY = rand((size / 2), camera.height - (size / 2));

    panel.context.beginPath();
    panel.context.arc(starX, starY, size, 0, Math.PI * 2, true);
    panel.context.closePath();
    panel.context.fillStyle = starColor;
    panel.context.fill();
  }
  return panel;
}

function setupTwinkleStars() {
  twinkleStars = [];
  var count = Math.floor((camera.width * camera.height) / (40 * 40) * 0.08);
  for (var i = 0; i < count; i++) {
    twinkleStars.push({
      x: Math.random() * camera.width,
      y: Math.random() * camera.height,
      size: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5
    });
  }
}

function setupBackgroundStars() {
  starLayers = [];
  setupTwinkleStars();

  starLayers.push({ canvas: createStarPanel(0.12, 1), key: 'bgStars1' });
  starLayers.push({ canvas: createStarPanel(0.06, 1), key: 'bgStars2' });
  starLayers.push({ canvas: createStarPanel(0.02, 2), key: 'bgStars3' });
  starLayers.push({ canvas: createStarPanel(0.01, 2), key: 'bgStars4' });
  starLayers.push({ canvas: createStarPanel(0.005, 3), key: 'bgStars5' });
}

// Draw tiling background stars based on camera position
function drawBackgroundStars() {
  // Tile size is based on camera (the panel size), but we fill the full canvas
  var tw = camera.width;
  var th = camera.height;
  var cw = canvas.width;
  var ch = canvas.height;

  for (var l = 0; l < starLayers.length; l++) {
    var layer = starLayers[l];
    var depth = parallax[layer.key];
    var offsetX = camera.scrollX * depth;
    var offsetY = camera.scrollY * depth;

    // Modulo wrap to a single tile offset
    var tileX = ((offsetX % tw) + tw) % tw;
    var tileY = ((offsetY % th) + th) % th;

    // Draw enough tiles to cover the full canvas
    for (var tx = -1; tx <= Math.ceil(cw / tw); tx++) {
      for (var ty = -1; ty <= Math.ceil(ch / th); ty++) {
        var drawX = tileX + tx * tw;
        var drawY = tileY + ty * th;
        if (drawX + tw > 0 && drawX < cw && drawY + th > 0 && drawY < ch) {
          canvas.context.drawImage(layer.canvas, drawX, drawY);
        }
      }
    }
  }

  // Twinkle overlay — distant layer (fills full canvas)
  var time = Date.now() / 1000;
  var twinkleOffsetX = camera.scrollX * parallax.twinkle;
  var twinkleOffsetY = camera.scrollY * parallax.twinkle;

  for (var i = 0; i < twinkleStars.length; i++) {
    var star = twinkleStars[i];
    var alpha = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
    var drawX = star.x + twinkleOffsetX;
    var drawY = star.y + twinkleOffsetY;

    // Wrap to tile size, then draw at all positions covering canvas
    drawX = ((drawX % tw) + tw) % tw;
    drawY = ((drawY % th) + th) % th;

    // Draw at all tiled positions that cover the full canvas
    for (var ox = drawX; ox < cw; ox += tw) {
      for (var oy = drawY; oy < ch; oy += th) {
        canvas.context.beginPath();
        canvas.context.arc(ox, oy, star.size * (0.8 + 0.2 * Math.sin(time * star.speed + star.phase)), 0, Math.PI * 2, true);
        canvas.context.closePath();
        canvas.context.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
        canvas.context.fill();
      }
    }
  }
}
