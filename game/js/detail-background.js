// Background star layers — created once, never regenerated
// Tiles infinitely based on camera position with parallax

var starLayers = [];
var twinkleStars = [];
var galaxyCanvas;
var galaxyBlur = 0;
var galaxyBorder = false;
var fgGalaxyInClouds = false;
var fgGalaxyUseBorder = false;

var fgGalaxyCanvas;
var fgGalaxyBlur = 0;
var fgGalaxyOpacity = 1;

function setupBackground() {
  createGalaxyLayer();
  createForegroundGalaxy();
  setupBackgroundStars();
}

function drawBackground() {
  drawGalaxyLayer();
  drawBackgroundStars();
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
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
  tileGalaxy(canvas.context, galaxyCanvas, galaxyBlur, camera.width, camera.height);
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
  var w = camera.width;
  var h = camera.height;

  for (var l = 0; l < starLayers.length; l++) {
    var layer = starLayers[l];
    var depth = parallax[layer.key];
    var offsetX = camera.scrollX * depth;
    var offsetY = camera.scrollY * depth;

    // Modulo wrap to a single tile offset
    var tileX = ((offsetX % w) + w) % w;
    var tileY = ((offsetY % h) + h) % h;

    // Draw 2x2 grid of tiles to cover viewport seamlessly
    for (var tx = -1; tx <= 1; tx++) {
      for (var ty = -1; ty <= 1; ty++) {
        var drawX = tileX + tx * w;
        var drawY = tileY + ty * h;
        if (drawX + w > 0 && drawX < w && drawY + h > 0 && drawY < h) {
          canvas.context.drawImage(layer.canvas, drawX, drawY);
        }
      }
    }
  }

  // Twinkle overlay — distant layer
  var time = Date.now() / 1000;
  var twinkleOffsetX = camera.scrollX * parallax.twinkle;
  var twinkleOffsetY = camera.scrollY * parallax.twinkle;

  for (var i = 0; i < twinkleStars.length; i++) {
    var star = twinkleStars[i];
    var alpha = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
    var drawX = star.x + twinkleOffsetX;
    var drawY = star.y + twinkleOffsetY;

    // Wrap to viewport
    drawX = ((drawX % w) + w) % w;
    drawY = ((drawY % h) + h) % h;

    canvas.context.beginPath();
    canvas.context.arc(drawX, drawY, star.size * (0.8 + 0.2 * Math.sin(time * star.speed + star.phase)), 0, Math.PI * 2, true);
    canvas.context.closePath();
    canvas.context.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    canvas.context.fill();
  }
}
