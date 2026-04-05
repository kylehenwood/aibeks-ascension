// all detail that appears infront of the character
// parralax

function setupBackground() {
  setupBackgroundStars();
}

function drawBackground() {
  drawBackgroundStars();
  // draw clouds at the bottom of screen.
  //drawBackgroundMoon(canvas.context);
  //drawBackgroundClouds(canvas.context);
}


// function drawBackgroundMoon(context) {
//   context.beginPath();
//   context.arc(canvas.width/2, canvas.height+128, 200, 0, 2 * Math.PI, false);
//   context.fillStyle = 'white';
//   context.fill();
//   context.closePath();
// }


// background contains... small stars (differing sizes / layers)
// MOON + lightrays
// shooting stars
// aruroa?

var starLayers = [];
var twinkleStars = [];

function createStarPanel(density,size) {
  var panel = document.createElement('canvas');
  panel.width = canvas.width;
  panel.height = canvas.height;
  panel.context = panel.getContext('2d');

  // how many stars on this panel?
  var area = (canvas.width*canvas.height)/(40*40);
  var starCount = area*density;
  var starSize = size;
  var starColor = 'rgba(255, 255, 255, 0.3)';

  // draw stars on panel
  for (var i = 0; i < starCount; i++) {
    var starX = rand((size/2),canvas.width-(size/2));
    var starY = rand((size/2),canvas.height-(size/2));

    panel.context.beginPath();
    panel.context.arc(starX, starY, starSize, 0, Math.PI*2, true);
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

  // DENSITY, SIZE, DEPTH
  // Each layer stores one panel texture and a parallax depth factor
  starLayers = [];
  setupTwinkleStars();

  // posZ = parallax depth. 0 = fixed, 1 = moves with camera exactly
  // Lower = further away (barely moves), higher = closer (rushes past)
  starLayers.push({canvas: createStarPanel(0.12, 1), key: 'bgStars1'});
  starLayers.push({canvas: createStarPanel(0.06, 1), key: 'bgStars2'});
  starLayers.push({canvas: createStarPanel(0.02, 2), key: 'bgStars3'});
  starLayers.push({canvas: createStarPanel(0.01, 2), key: 'bgStars4'});
  starLayers.push({canvas: createStarPanel(0.005,3), key: 'bgStars5'});
}



// Called by RAF
function drawBackgroundStars() {
  var w = canvas.width;
  var h = canvas.height;

  starLayers.forEach(function(layer) {
    var depth = parallax[layer.key];
    var offsetX = camera.scrollX * depth;
    var offsetY = camera.scrollY * depth;

    // Wrap to a single tile offset using modulo
    var tileX = ((offsetX % w) + w) % w;
    var tileY = ((offsetY % h) + h) % h;

    // Draw tiles to cover the viewport seamlessly
    for (var tx = -1; tx <= 1; tx++) {
      for (var ty = -1; ty <= 1; ty++) {
        var drawX = tileX + tx * w;
        var drawY = tileY + ty * h;
        if (drawX + w > 0 && drawX < w && drawY + h > 0 && drawY < h) {
          canvas.context.drawImage(layer.canvas, drawX, drawY);
        }
      }
    }
  });

  // twinkle overlay — sits on the distant layer
  var time = Date.now() / 1000;
  var twinkleOffsetX = camera.scrollX * parallax.twinkle;
  var twinkleOffsetY = camera.scrollY * parallax.twinkle;

  twinkleStars.forEach(function(star) {
    var alpha = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
    var drawX = star.x + twinkleOffsetX;
    var drawY = star.y + twinkleOffsetY;

    // wrap
    drawX = ((drawX % w) + w) % w;
    drawY = ((drawY % h) + h) % h;

    canvas.context.beginPath();
    canvas.context.arc(drawX, drawY, star.size * (0.8 + 0.2 * Math.sin(time * star.speed + star.phase)), 0, Math.PI * 2, true);
    canvas.context.closePath();
    canvas.context.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    canvas.context.fill();
  });
}
