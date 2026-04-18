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
    { clouds: backgroundClouds, baseY: (camera.height - 160) + camera.y * parallax.cloud1 },
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

// Pre-rendered glow circles for button (masked through clouds like galaxy)
// Cyan is the default, red appears on hover — they crossfade via hoverT
var buttonGlowCyan;
var buttonGlowRed;

function createButtonGlowCanvas() {
  var cx = playButton.posX + playButton.width / 2;
  var cy = playButton.posY + playButton.height / 2;

  buttonGlowCyan = document.createElement('canvas');
  buttonGlowCyan.width = camera.width;
  buttonGlowCyan.height = camera.height;
  var ctxC = buttonGlowCyan.getContext('2d');
  ctxC.filter = 'blur(80px)';
  ctxC.fillStyle = 'cyan';
  ctxC.beginPath();
  ctxC.arc(cx, cy, 200, 0, Math.PI * 2);
  ctxC.fill();
  ctxC.filter = 'none';

  buttonGlowRed = document.createElement('canvas');
  buttonGlowRed.width = camera.width;
  buttonGlowRed.height = camera.height;
  var ctxR = buttonGlowRed.getContext('2d');
  ctxR.filter = 'blur(80px)';
  ctxR.fillStyle = 'red';
  ctxR.beginPath();
  ctxR.arc(cx, cy, 200, 0, Math.PI * 2);
  ctxR.fill();
  ctxR.filter = 'none';
}

function drawMaskedButtonGlow(context, layer, x, y) {
  var mc = galaxyMaskCanvas.context;
  var maskCanvas = fgGalaxyUseBorder ? layer.strokeCanvas : layer.canvas;
  var h = playButton.hoverT;
  var cyanAlpha = 1 - h;
  var redAlpha = h;

  // Cyan layer
  if (cyanAlpha > 0.005) {
    mc.clearRect(0, 0, camera.width, camera.height);
    mc.globalCompositeOperation = 'source-over';
    mc.globalAlpha = cyanAlpha;
    mc.drawImage(buttonGlowCyan, 0, 0);
    mc.globalAlpha = 1;
    mc.globalCompositeOperation = 'destination-in';
    mc.drawImage(maskCanvas, x, y);
    mc.globalCompositeOperation = 'source-over';
    context.drawImage(galaxyMaskCanvas, 0, 0);
  }

  // Red layer
  if (redAlpha > 0.005) {
    mc.clearRect(0, 0, camera.width, camera.height);
    mc.globalCompositeOperation = 'source-over';
    mc.globalAlpha = redAlpha;
    mc.drawImage(buttonGlowRed, 0, 0);
    mc.globalAlpha = 1;
    mc.globalCompositeOperation = 'destination-in';
    mc.drawImage(maskCanvas, x, y);
    mc.globalCompositeOperation = 'source-over';
    context.drawImage(galaxyMaskCanvas, 0, 0);
  }
}

// Character glow — cyan blob that follows the character, masked through clouds
var charGlowCanvas;

function createCharGlowCanvas() {
  // Pre-render a centered cyan blob; we'll position it at draw time
  charGlowCanvas = document.createElement('canvas');
  charGlowCanvas.width = 600;
  charGlowCanvas.height = 600;
  var ctx = charGlowCanvas.getContext('2d');
  ctx.filter = 'blur(80px)';
  ctx.fillStyle = 'cyan';
  ctx.beginPath();
  ctx.arc(300, 300, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = 'none';
}

function drawMaskedCharGlow(context, layer, lx, ly) {
  var mc = galaxyMaskCanvas.context;
  var maskCanvas = fgGalaxyUseBorder ? layer.strokeCanvas : layer.canvas;

  // Character screen position
  var cx = character.centerX + camera.x * parallax.gamePanel;
  var cy = character.centerY + camera.y * parallax.gamePanel;

  mc.clearRect(0, 0, camera.width, camera.height);
  mc.globalCompositeOperation = 'source-over';
  mc.drawImage(charGlowCanvas, cx - 300, cy - 300);
  mc.globalCompositeOperation = 'destination-in';
  mc.drawImage(maskCanvas, lx, ly);
  mc.globalCompositeOperation = 'source-over';
  context.drawImage(galaxyMaskCanvas, 0, 0);
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
  createSmallCloud(camera.width * 2);
  createSmallCloud(camera.width * 3);

  createTinyCloud(0);
  createTinyCloud(camera.width);
  createTinyCloud(camera.width * 2);
  createTinyCloud(camera.width * 3);

  createButtonGlowCanvas();
  createCharGlowCanvas();
}

// HOW TO MAKE THE CLOUDS ENDLESS???

// Draw just the background cloud layer (behind platform/menu content)
function drawBackgroundClouds(context, isAnimating) {
  var y1 = camera.y * parallax.cloud1;
  var x1 = camera.vx * dt * parallax.cloud1;
  var cloudDriftScale = (gameState === 'sandbox') ? 0.15 : 1;
  if (isAnimating === true) x1 -= 0.1 * dt * cloudDriftScale;

  var backgroundCloudY = (camera.height - 160) + y1;
  context.drawImage(backgroundClouds[0].canvas, 0, backgroundCloudY);
}

function drawForeground(context, isAnimating) {

  // Cloud parallax: multipliers > 1 so clouds rush past faster than the game layer
  // This creates the "overtake" effect when the camera pans down on restart
  var y1 = camera.y * parallax.cloud1;
  var y2 = camera.y * parallax.cloud2;
  var y3 = camera.y * parallax.cloud3;

  var x2 = camera.vx * dt * parallax.cloud2;
  var x3 = camera.vx * dt * parallax.cloud3;

  // always drift horizontally
  var fgDriftScale = (gameState === 'sandbox') ? 0.15 : 1;
  if (isAnimating === true) {
    x2 -= 0.2 * dt * fgDriftScale;
    x3 -= 0.3 * dt * fgDriftScale;
  }

  // Background cloud Y (drawn separately via drawBackgroundClouds before platform)
  var backgroundCloudY = (camera.height-160)+y1;

  var smallCloudY = (camera.height-200)+y2;
  cloudMove(context, smallClouds, x2, smallCloudY);

  var tinyCloudY = (camera.height-200)+y3;
  cloudMove(context, tinyClouds, x3, tinyCloudY);

  // Foreground galaxy — either direct (in front) or masked inside clouds
  if (fgGalaxyInClouds) {
    drawMaskedFgGalaxy(context, backgroundClouds[0], 0, backgroundCloudY);
    for (var i = 0; i < smallClouds.length; i++) {
      drawMaskedFgGalaxy(context, smallClouds[i], smallClouds[i].posX, smallCloudY);
    }
    for (var i = 0; i < tinyClouds.length; i++) {
      drawMaskedFgGalaxy(context, tinyClouds[i], tinyClouds[i].posX, tinyCloudY);
    }
  } else {
    drawFgGalaxyToContext(context, camera.width, camera.height);
  }

  // Button glow — cyan by default, transitions to red on hover (menu only)
  // Fades in/out with playButton.alpha so it matches button visibility
  if (gameState === 'gameMenu' || gameState === 'menuAnimation' || gameState === 'starting') {
    var hoverTarget = playButton.hover ? 1 : 0;
    playButton.hoverT += (hoverTarget - playButton.hoverT) * 0.12 * dt;

    if (playButton.alpha > 0.005) {
      context.save();
      context.globalAlpha = playButton.alpha;
      drawMaskedButtonGlow(context, backgroundClouds[0], 0, backgroundCloudY);
      for (var i = 0; i < smallClouds.length; i++) {
        drawMaskedButtonGlow(context, smallClouds[i], smallClouds[i].posX, smallCloudY);
      }
      for (var i = 0; i < tinyClouds.length; i++) {
        drawMaskedButtonGlow(context, tinyClouds[i], tinyClouds[i].posX, tinyCloudY);
      }
      context.restore();
    }
  }

  // Character glow — cyan, masked through clouds (gameplay only)
  if (gameState === 'playGame' || gameState === 'animateGameOver' || gameState === 'gameRestart') {
    drawMaskedCharGlow(context, backgroundClouds[0], 0, backgroundCloudY);
    for (var i = 0; i < smallClouds.length; i++) {
      drawMaskedCharGlow(context, smallClouds[i], smallClouds[i].posX, smallCloudY);
    }
    for (var i = 0; i < tinyClouds.length; i++) {
      drawMaskedCharGlow(context, tinyClouds[i], tinyClouds[i].posX, tinyCloudY);
    }
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
function cloudMove(context, clouds, dx, posY) {
  var count = clouds.length;
  var totalWidth = count * camera.width;

  for (var i = 0; i < count; i++) {
    clouds[i].posX += dx;
    // Wrap around the full strip width
    clouds[i].posX = ((clouds[i].posX + camera.width) % totalWidth + totalWidth) % totalWidth - camera.width;
    context.drawImage(clouds[i].canvas, clouds[i].posX, posY);
  }
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
  backgroundCloud.context.rect(0,80,backgroundCloud.canvas.width,280);
  backgroundCloud.context.fillStyle = 'rgba(255,255,255,0.2)';
  backgroundCloud.context.fill();
  backgroundCloud.context.closePath();

  // Stroke canvas — 4px outline for galaxy masking
  backgroundCloud.strokeCanvas = document.createElement('canvas');
  backgroundCloud.strokeCanvas.width = camera.width;
  backgroundCloud.strokeCanvas.height = 400;
  var sc = backgroundCloud.strokeCanvas.getContext('2d');
  // Gradient from blue (top) to red (bottom) — spans cloud height
  var grad = sc.createLinearGradient(0, 80, 0, 80 + 280);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  // Fill cloud rect then clear inset by 4px to get an inner border
  sc.fillStyle = grad;
  sc.fillRect(0, 80, backgroundCloud.canvas.width, 280);
  sc.clearRect(0 + 4, 80 + 4, backgroundCloud.canvas.width - 8, 280 - 8);

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

    // Snap X to 8px grid
    width = Math.round(width / 8) * 8;

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
    width += cloudWidth + 8*rand(1,3);
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

    // Snap X to 8px grid
    width = Math.round(width / 8) * 8;

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
    width += cloudWidth + 8*rand(2,5);
  }

  tinyClouds.push(tinyCloud);
}
