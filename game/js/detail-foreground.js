// all detail that appears infront of the character
var tinyClouds = [];
var smallClouds = [];
var backgroundClouds = [];

// Cloud interaction particles
var cloudParticles = [];

// Reusable full-screen canvas for galaxy-through-stroke compositing
var galaxyMaskCanvas;

// Check if a screen position overlaps an actual cloud pixel
function isInCloud(screenX, screenY) {
  // Check each cloud layer
  var layers = [
    { clouds: backgroundClouds, baseY: (camera.height - 200) + camera.y * parallax.cloud1 },
    { clouds: smallClouds,      baseY: (camera.height - 200) + camera.y * parallax.cloud2 },
    { clouds: tinyClouds,       baseY: (camera.height - 200) + camera.y * parallax.cloud3 }
  ];

  for (var l = 0; l < layers.length; l++) {
    var layer = layers[l];
    for (var c = 0; c < layer.clouds.length; c++) {
      var cloud = layer.clouds[c];
      // Position on the cloud canvas
      var cx = screenX - cloud.posX;
      var cy = screenY - layer.baseY;

      if (cx >= 0 && cx < cloud.canvas.width && cy >= 0 && cy < cloud.canvas.height) {
        // Sample the pixel
        var pixel = cloud.context.getImageData(Math.floor(cx), Math.floor(cy), 1, 1).data;
        if (pixel[3] > 10) return true; // any non-transparent pixel
      }
    }
  }
  return false;
}

function updateCloudParticles(context) {
  var charScreenX = character.centerX + camera.x;
  var charScreenY = character.centerY + camera.y;

  // Only spawn if character actually overlaps a cloud pixel
  if (isInCloud(charScreenX, charScreenY)) {
    var speed = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);
    var spawnChance = Math.min(speed * 0.12, 0.6);

    if (Math.random() < spawnChance) {
      var size = 2 + Math.random() * 3;
      cloudParticles.push({
        x: charScreenX + (Math.random() - 0.5) * character.size,
        y: charScreenY + (Math.random() - 0.5) * character.size * 0.5,
        vx: physics.vx * (0.2 + Math.random() * 0.3) + (Math.random() - 0.5) * 1,
        vy: physics.vy * (0.2 + Math.random() * 0.3) + (Math.random() - 0.5) * 1,
        size: size,
        life: 1,
        decay: 0.008 + Math.random() * 0.008
      });
    }
  }

  // Update and draw particles
  for (var i = cloudParticles.length - 1; i >= 0; i--) {
    var p = cloudParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.99;
    p.vy *= 0.99;
    p.life -= p.decay * dt;

    if (p.life <= 0) {
      cloudParticles.splice(i, 1);
      continue;
    }

    context.fillStyle = 'rgba(255,255,255,' + (p.life * 0.5) + ')';
    context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
}

function setupForeground() {
  // Create the reusable compositing canvas
  galaxyMaskCanvas = document.createElement('canvas');
  galaxyMaskCanvas.width = camera.width;
  galaxyMaskCanvas.height = camera.height;
  galaxyMaskCanvas.context = galaxyMaskCanvas.getContext('2d');

  createBackgroundCloud(0);

  createSmallCloud(0);
  createSmallCloud(camera.width);

  createTinyCloud(0);
  createTinyCloud(camera.width);
}

// HOW TO MAKE THE CLOUDS ENDLESS???

function drawForeground(context,isAnimating) {

  // Cloud parallax: multipliers > 1 so clouds rush past faster than the game layer
  // This creates the "overtake" effect when the camera pans down on restart
  var y1 = camera.y * parallax.cloud1;
  var y2 = camera.y * parallax.cloud2;
  var y3 = camera.y * parallax.cloud3;

  var x1 = camera.vx * dt * parallax.cloud1;
  var x2 = camera.vx * dt * parallax.cloud2;
  var x3 = camera.vx * dt * parallax.cloud3;

  // Mouse parallax draw offsets for clouds (menu only)
  var mouseOffX1 = 0, mouseOffX2 = 0, mouseOffX3 = 0;
  var mouseOffY1 = 0, mouseOffY2 = 0, mouseOffY3 = 0;
  if (gameState === 'gameMenu' && typeof menuMouse !== 'undefined') {
    mouseOffX1 = menuMouse.x * -20;
    mouseOffX2 = menuMouse.x * -28;
    mouseOffX3 = menuMouse.x * -36;
    mouseOffY1 = menuMouse.y * -10;
    mouseOffY2 = menuMouse.y * -14;
    mouseOffY3 = menuMouse.y * -18;
  }

  // always drift horizontally
  if (isAnimating === true) {
    x1 -= 0.1*dt;
    x2 -= 0.2*dt;
    x3 -= 0.3*dt;
  }

  // Background cloud: static X, parallax Y only
  var backgroundCloudY = (camera.height-200)+y1;
  var bgOy = mouseOffY1 || 0;

  context.drawImage(backgroundClouds[0].canvas, 0, backgroundCloudY + bgOy);

  var smallCloudY = (camera.height-200)+y2;
  cloudMove(context,smallClouds[0],smallClouds[1],x2,smallCloudY,mouseOffX2,mouseOffY2);

  var tinyCloudY = (camera.height-200)+y3;
  cloudMove(context,tinyClouds[0],tinyClouds[1],x3,tinyCloudY,mouseOffX3,mouseOffY3);

  // Foreground galaxy — either direct (in front) or masked inside clouds
  if (fgGalaxyInClouds) {
    // Background cloud
    drawMaskedFgGalaxy(context, backgroundClouds[0], 0, backgroundCloudY + bgOy);
    // Small clouds (tiling pair)
    drawMaskedFgGalaxy(context, smallClouds[0], smallClouds[0].posX + mouseOffX2, smallCloudY + mouseOffY2);
    drawMaskedFgGalaxy(context, smallClouds[1], smallClouds[1].posX + mouseOffX2, smallCloudY + mouseOffY2);
    // Tiny clouds (tiling pair)
    drawMaskedFgGalaxy(context, tinyClouds[0], tinyClouds[0].posX + mouseOffX3, tinyCloudY + mouseOffY3);
    drawMaskedFgGalaxy(context, tinyClouds[1], tinyClouds[1].posX + mouseOffX3, tinyCloudY + mouseOffY3);
  } else {
    drawFgGalaxyToContext(context, camera.width, camera.height);
  }

  // Cloud interaction particles
  if (gameState === 'playGame' || gameState === 'animateGameOver') {
    updateCloudParticles(context);
  }
}

// Draw foreground galaxy masked by a single cloud canvas
function drawMaskedFgGalaxy(context, layer, x, y) {
  var mc = galaxyMaskCanvas.context;
  mc.clearRect(0, 0, camera.width, camera.height);

  // Draw galaxy first
  mc.globalCompositeOperation = 'source-over';
  drawFgGalaxyToContext(mc, camera.width, camera.height);

  // Cut to cloud shape — keep galaxy only inside this cloud
  mc.globalCompositeOperation = 'destination-in';
  var maskCanvas = fgGalaxyUseBorder ? layer.strokeCanvas : layer.canvas;
  mc.drawImage(maskCanvas, x, y);

  mc.globalCompositeOperation = 'source-over';
  context.drawImage(galaxyMaskCanvas, 0, 0);
}


// move the two cloud layers and position so they do not overlap or distance from each other
// at any point
function cloudMove(context,cloudLayer,cloudOther,posX,posY,drawOffX,drawOffY) {
  cloudLayer.posX += posX;
  cloudOther.posX += posX;

  if (cloudLayer.posX < -camera.width) {
    cloudLayer.posX = cloudOther.posX+camera.width;
  }
  if (cloudLayer.posX > camera.width) {
    cloudLayer.posX = cloudOther.posX-camera.width;
  }
  if (cloudOther.posX < -camera.width) {
    cloudOther.posX = cloudLayer.posX+camera.width;
  }
  if (cloudOther.posX > camera.width) {
    cloudOther.posX = cloudLayer.posX-camera.width;
  }
  var ox = drawOffX || 0;
  var oy = drawOffY || 0;

  // Draw cloud fills
  context.drawImage(cloudLayer.canvas,cloudLayer.posX+ox,posY+oy);
  context.drawImage(cloudOther.canvas,cloudOther.posX+ox,posY+oy);
}


//--
function createBackgroundCloud(posX) {

  var backgroundCloud = {
    canvas: null,
    context: null,
    strokeCanvas: null,
    posX: posX
  }

  // 400 = (400-(120*2)) = 160

  backgroundCloud.canvas = document.createElement('canvas');
  backgroundCloud.canvas.width = camera.width;
  backgroundCloud.canvas.height = 400;
  backgroundCloud.context = backgroundCloud.canvas.getContext('2d');

  backgroundCloud.context.beginPath();
  backgroundCloud.context.rect(0,140,backgroundCloud.canvas.width,160);
  backgroundCloud.context.fillStyle = 'rgba(255,255,255,0.4)';
  backgroundCloud.context.fill();
  backgroundCloud.context.closePath();

  // Stroke canvas — 4px outline for galaxy masking
  backgroundCloud.strokeCanvas = document.createElement('canvas');
  backgroundCloud.strokeCanvas.width = camera.width;
  backgroundCloud.strokeCanvas.height = 400;
  var sc = backgroundCloud.strokeCanvas.getContext('2d');
  // Gradient from blue (top) to red (bottom) — spans cloud height
  var grad = sc.createLinearGradient(0, 140, 0, 140 + 160);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  // Fill cloud rect then clear inset by 4px to get an inner border
  sc.fillStyle = grad;
  sc.fillRect(0, 140, backgroundCloud.canvas.width, 160);
  sc.clearRect(0 + 4, 140 + 4, backgroundCloud.canvas.width - 8, 160 - 8);

  backgroundClouds.push(backgroundCloud);
}



function createSmallCloud(posX) {
  var smallCloud = {
    canvas: null,
    context: null,
    strokeCanvas: null,
    posX: posX
  }

  smallCloud.canvas = document.createElement('canvas');
  smallCloud.canvas.width = camera.width;
  smallCloud.canvas.height = 400;
  smallCloud.context = smallCloud.canvas.getContext('2d');

  // Stroke canvas for galaxy masking
  smallCloud.strokeCanvas = document.createElement('canvas');
  smallCloud.strokeCanvas.width = camera.width;
  smallCloud.strokeCanvas.height = 400;
  var sc = smallCloud.strokeCanvas.getContext('2d');

  var context = smallCloud.context;

  // drawClouds randomly? (no overlap)
  var width = 0;

  // vert band where clouds can be placed. (80--240--80)
  var cloudBand = 300;
  var cloudBandSpace = (400-cloudBand)/2;
  var bandCalc = Math.floor(cloudBand/8)

  var canvasWidth = smallCloud.canvas.width;

  while (width < camera.width-24) {
    var cloudPosY = 8*rand(0,bandCalc)+cloudBandSpace;
    var cloudWidth = 8*rand(8,20);
    var cloudHeight = 8*rand(4,8);
    var cloudFill = rand(2,6)*0.1;

    // only create the cloud if it fits inside the canvas
    if (width+cloudWidth < canvasWidth) {
      context.beginPath();
      context.fillStyle = 'rgba(255,255,255,'+cloudFill+')';
      context.fillRect(width,cloudPosY,cloudWidth,cloudHeight);
      context.closePath();

      // 4px inner stroke — gradient spans this cloud's height
      var grad = sc.createLinearGradient(0, cloudPosY, 0, cloudPosY + cloudHeight);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      sc.fillStyle = grad;
      sc.fillRect(width, cloudPosY, cloudWidth, cloudHeight);
      sc.clearRect(width + 4, cloudPosY + 4, cloudWidth - 8, cloudHeight - 8);
    }
    width += cloudWidth+(12*rand(1,2));
  }
  smallClouds.push(smallCloud);
}


function createTinyCloud(posX) {
  var tinyCloud = {
    canvas: null,
    context: null,
    strokeCanvas: null,
    posX: posX
  }

  tinyCloud.canvas = document.createElement('canvas');
  tinyCloud.canvas.width = camera.width;
  tinyCloud.canvas.height = 400;
  tinyCloud.context = tinyCloud.canvas.getContext('2d');

  // Stroke canvas for galaxy masking
  tinyCloud.strokeCanvas = document.createElement('canvas');
  tinyCloud.strokeCanvas.width = camera.width;
  tinyCloud.strokeCanvas.height = 400;
  var sc = tinyCloud.strokeCanvas.getContext('2d');

  var context = tinyCloud.context;

  // drawClouds randomly? (no overlap)
  var width = 0;

  // vert band where clouds can be placed. (80--240--80)
  var cloudBand = 360;
  var cloudBandSpace = (400-cloudBand)/2;
  var bandCalc = Math.floor(cloudBand/8)

  var canvasWidth = tinyCloud.canvas.width;

  while (width < camera.width-24) {
    var cloudPosY = 8*rand(0,bandCalc)+cloudBandSpace;
    var cloudWidth = 8*rand(3,6);
    var cloudHeight = 24;

    // only create the cloud if it fits inside the canvas
    if (width+cloudWidth < canvasWidth) {
      context.beginPath();
      context.fillStyle = 'rgba(255,255,255,0.6)';
      context.fillRect(width,cloudPosY,cloudWidth,cloudHeight);
      context.closePath();

      // 4px inner stroke — gradient spans this cloud's height
      var grad = sc.createLinearGradient(0, cloudPosY, 0, cloudPosY + cloudHeight);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      sc.fillStyle = grad;
      sc.fillRect(width, cloudPosY, cloudWidth, cloudHeight);
      sc.clearRect(width + 4, cloudPosY + 4, cloudWidth - 8, cloudHeight - 8);
    }
    width += cloudWidth+(12*rand(2,4));
  }

  tinyClouds.push(tinyCloud);
}
