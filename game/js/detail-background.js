// Background star layers — created once, never regenerated
// Tiles infinitely based on camera position with parallax

var starLayers = [];
var twinkleStars = [];

function setupBackground() {
  setupBackgroundStars();
}

function drawBackground() {
  drawBackgroundStars();
}

function createStarPanel(density, size) {
  var panel = document.createElement('canvas');
  panel.width = canvas.width;
  panel.height = canvas.height;
  panel.context = panel.getContext('2d');

  var area = (canvas.width * canvas.height) / (40 * 40);
  var starCount = area * density;
  var starColor = 'rgba(255, 255, 255, 0.3)';

  for (var i = 0; i < starCount; i++) {
    var starX = rand((size / 2), canvas.width - (size / 2));
    var starY = rand((size / 2), canvas.height - (size / 2));

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
  var count = Math.floor((canvas.width * canvas.height) / (40 * 40) * 0.08);
  for (var i = 0; i < count; i++) {
    twinkleStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
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
  var w = canvas.width;
  var h = canvas.height;

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
