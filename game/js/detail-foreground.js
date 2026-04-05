// all detail that appears infront of the character
var tinyClouds = [];
var smallClouds = [];
var backgroundClouds = [];

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
  var y1 = camera.y * 1.2;
  var y2 = camera.y * 1.5;
  var y3 = camera.y * 1.8;

  var x1 = camera.vx * dt;
  var x2 = camera.vx * dt * 1.2;
  var x3 = camera.vx * dt * 1.4;

  // always drift horizontally
  if (isAnimating === true) {
    x1 -= 0.1*dt;
    x2 -= 0.2*dt;
    x3 -= 0.3*dt;
  }

  var backgroundCloudY = (canvas.height-200)+y1;
  cloudMove(context,backgroundClouds[0],backgroundClouds[1],x1,backgroundCloudY);

  var smallCloudY = (canvas.height-200)+y2;
  cloudMove(context,smallClouds[0],smallClouds[1],x2,smallCloudY);

  var tinyCloudY = (canvas.height-200)+y3;
  cloudMove(context,tinyClouds[0],tinyClouds[1],x3,tinyCloudY);
}


// move the two cloud layers and position so they do not overlap or distance from each other
// at any point
function cloudMove(context,cloudLayer,cloudOther,posX,posY) {
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
  context.drawImage(cloudLayer.canvas,cloudLayer.posX,posY);
  context.drawImage(cloudOther.canvas,cloudOther.posX,posY);
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
