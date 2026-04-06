// all detail that appears infront of the character
var tinyClouds = [];
var smallClouds = [];
var backgroundClouds = [];

// Cloud interaction particles
var cloudParticles = [];

// Check if a screen position overlaps an actual cloud pixel
function isInCloud(screenX, screenY) {
  // Check each cloud layer
  var layers = [
    { clouds: backgroundClouds, baseY: (canvas.height - 200) + camera.y * parallax.cloud1 },
    { clouds: smallClouds,      baseY: (canvas.height - 200) + camera.y * parallax.cloud2 },
    { clouds: tinyClouds,       baseY: (canvas.height - 200) + camera.y * parallax.cloud3 }
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
  createBackgroundCloud(0);
  createBackgroundCloud(canvas.width);

  createSmallCloud(0);
  createSmallCloud(canvas.width);

  createTinyCloud(0);
  createTinyCloud(canvas.width);
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

  var backgroundCloudY = (canvas.height-200)+y1;
  cloudMove(context,backgroundClouds[0],backgroundClouds[1],x1,backgroundCloudY,mouseOffX1,mouseOffY1);

  var smallCloudY = (canvas.height-200)+y2;
  cloudMove(context,smallClouds[0],smallClouds[1],x2,smallCloudY,mouseOffX2,mouseOffY2);

  var tinyCloudY = (canvas.height-200)+y3;
  cloudMove(context,tinyClouds[0],tinyClouds[1],x3,tinyCloudY,mouseOffX3,mouseOffY3);

  // Cloud interaction particles
  if (gameState === 'playGame' || gameState === 'animateGameOver') {
    updateCloudParticles(context);
  }
}


// move the two cloud layers and position so they do not overlap or distance from each other
// at any point
function cloudMove(context,cloudLayer,cloudOther,posX,posY,drawOffX,drawOffY) {
  cloudLayer.posX += posX;
  cloudOther.posX += posX;

  if (cloudLayer.posX < -canvas.width) {
    cloudLayer.posX = cloudOther.posX+canvas.width;
  }
  if (cloudLayer.posX > canvas.width) {
    cloudLayer.posX = cloudOther.posX-canvas.width;
  }
  if (cloudOther.posX < -canvas.width) {
    cloudOther.posX = cloudLayer.posX+canvas.width;
  }
  if (cloudOther.posX > canvas.width) {
    cloudOther.posX = cloudLayer.posX-canvas.width;
  }
  var ox = drawOffX || 0;
  var oy = drawOffY || 0;
  context.drawImage(cloudLayer.canvas,cloudLayer.posX+ox,posY+oy);
  context.drawImage(cloudOther.canvas,cloudOther.posX+ox,posY+oy);
}


//--
function createBackgroundCloud(posX) {

  var backgroundCloud = {
    canvas: null,
    context: null,
    posX: posX
  }

  // 400 = (400-(120*2)) = 160

  backgroundCloud.canvas = document.createElement('canvas');
  backgroundCloud.canvas.width = canvas.width;
  backgroundCloud.canvas.height = 400;
  backgroundCloud.context = backgroundCloud.canvas.getContext('2d');

  backgroundCloud.context.beginPath();
  backgroundCloud.context.rect(0,140,backgroundCloud.canvas.width,160);
  backgroundCloud.context.fillStyle = 'rgba(255,255,255,0.4)';
  backgroundCloud.context.fill();
  backgroundCloud.context.closePath();

  // cloud line cap
  // backgroundCloud.context.beginPath();
  // backgroundCloud.context.rect(0,120,1,160);
  // backgroundCloud.context.fillStyle = 'rgba(255,0,0,1)';
  // backgroundCloud.context.fill();
  // backgroundCloud.context.closePath();

  backgroundClouds.push(backgroundCloud);
}



function createSmallCloud(posX) {
  var smallCloud = {
    canvas: null,
    context: null,
    posX: posX
  }

  smallCloud.canvas = document.createElement('canvas');
  smallCloud.canvas.width = canvas.width;
  smallCloud.canvas.height = 400;
  smallCloud.context = smallCloud.canvas.getContext('2d');

  var context = smallCloud.context;

  // drawClouds randomly? (no overlap)
  var width = 0;

  // vert band where clouds can be placed. (80--240--80)
  var cloudBand = 300;
  var cloudBandSpace = (400-cloudBand)/2;
  var bandCalc = Math.floor(cloudBand/8)

  var canvasWidth = smallCloud.canvas.width;

  while (width < canvas.width-24) {
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
    }
    width += cloudWidth+(24*rand(1,2));
  }
  smallClouds.push(smallCloud);
}


function createTinyCloud(posX) {
  var tinyCloud = {
    canvas: null,
    context: null,
    posX: posX
  }

  tinyCloud.canvas = document.createElement('canvas');
  tinyCloud.canvas.width = canvas.width;
  tinyCloud.canvas.height = 400;
  tinyCloud.context = tinyCloud.canvas.getContext('2d');

  var context = tinyCloud.context;

  // drawClouds randomly? (no overlap)
  var width = 0;

  // vert band where clouds can be placed. (80--240--80)
  var cloudBand = 360;
  var cloudBandSpace = (400-cloudBand)/2;
  var bandCalc = Math.floor(cloudBand/8)

  var canvasWidth = tinyCloud.canvas.width;

  while (width < canvas.width-24) {
    var cloudPosY = 8*rand(0,bandCalc)+cloudBandSpace;
    var cloudWidth = 8*rand(3,6);
    var cloudHeight = 24;

    // only create the cloud if it fits inside the canvas
    if (width+cloudWidth < canvasWidth) {
      context.beginPath();
      context.fillStyle = 'rgba(255,255,255,0.6)';
      context.fillRect(width,cloudPosY,cloudWidth,cloudHeight);
      context.closePath();
    }
    width += cloudWidth+(24*rand(2,4));
  }

  tinyClouds.push(tinyCloud);
}
