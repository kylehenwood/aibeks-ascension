// buttons on the introduction screen

var playButton = {
  width: 240,
  height: 64,
  posX: null,
  posY: null,
  action: 'animateStart',
  canvas: null,
  context: null,
  progress: 0
}
function createPlayButton(data){
  playButton.posX = (canvas.width/2)-(240/2),
  playButton.posY = (canvas.height/2)+240,

  playButton.canvas = document.createElement('canvas');
  playButton.canvas.width = data.width;
  playButton.canvas.height = data.height;
  playButton.context = playButton.canvas.getContext('2d');
  setPlayButton();
}

function updatePlayButton() {
  var context = playButton.context;
  var width = playButton.width*(playButton.progress/100);
  var offset = (playButton.width/2)-(width/2);

  if (playButton.progress === 0) {
    playButton.progress = 1;
  } else {
    if (playButton.progress < 99.5) {
      var progress = animateEaseOut(100,playButton.progress,12);
      playButton.progress += progress;
    } else {
      playButton.progress = 100;
    }
  }


  context.clearRect(0,0,playButton.width,playButton.height);

  context.beginPath();
  context.fillStyle = 'white';
  context.fillRect(offset,0,width,2)
  context.closePath();
}

function setPlayButton() {

  playButton.progress = 0;

  var context = playButton.context;

  context.clearRect(0,0,playButton.width,playButton.height);
  // button background
  context.beginPath();
  context.fillStyle = 'white';
  context.fillRect(0,0,playButton.width,2)
  context.closePath();
  // button text
  context.fillStyle = 'white';
  context.font = 'bold 18px sans-serif';
  context.textBaseline="middle";
  context.textAlign="center";
  context.fillText('CLICK TO START', playButton.width/2, playButton.height/2);
}

// Mode selection UI
var modeSelect = {
  dragStartX: 0,
  dragCurrentX: 0,
  dragging: false,
  selectedMode: null,   // 'endless' or 'platform' during drag
  swipeThreshold: 80,   // px needed to commit
  canvas: null,
  context: null
}

function createModeSelect() {
  modeSelect.canvas = document.createElement('canvas');
  modeSelect.canvas.width = canvas.width;
  modeSelect.canvas.height = 120;
  modeSelect.context = modeSelect.canvas.getContext('2d');
}

function drawModeSelect() {
  var ctx = modeSelect.context;
  var w = modeSelect.canvas.width;
  var h = modeSelect.canvas.height;
  ctx.clearRect(0, 0, w, h);

  var dragDist = modeSelect.dragCurrentX - modeSelect.dragStartX;
  var leftAlpha = 0.3;
  var rightAlpha = 0.3;

  if (modeSelect.dragging) {
    if (dragDist < 0) {
      // dragging left → endless
      leftAlpha = Math.min(1, 0.3 + Math.abs(dragDist) / modeSelect.swipeThreshold * 0.7);
    } else if (dragDist > 0) {
      // dragging right → platform
      rightAlpha = Math.min(1, 0.3 + Math.abs(dragDist) / modeSelect.swipeThreshold * 0.7);
    }
  }

  // Left label: ENDLESS
  ctx.save();
  ctx.globalAlpha = leftAlpha;
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Arrow and text
  ctx.fillText('ENDLESS', w / 2 - 140, h / 2);
  // Left arrow
  ctx.beginPath();
  ctx.moveTo(w / 2 - 220, h / 2);
  ctx.lineTo(w / 2 - 200, h / 2 - 8);
  ctx.lineTo(w / 2 - 200, h / 2 + 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Right label: PLATFORM
  ctx.save();
  ctx.globalAlpha = rightAlpha;
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('PLATFORM', w / 2 + 140, h / 2);
  // Right arrow
  ctx.beginPath();
  ctx.moveTo(w / 2 + 220, h / 2);
  ctx.lineTo(w / 2 + 200, h / 2 - 8);
  ctx.lineTo(w / 2 + 200, h / 2 + 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Center divider dot
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
  ctx.fill();
}


//--
var themeButton = {
  width: 64,
  height: 64,
  action: 'changeTheme',
  canvas: null,
  context: null
}
function createThemeButton(data){
  themeButton.posX = canvas.width-88,
  themeButton.posY = 24,
  themeButton.canvas = document.createElement('canvas');
  themeButton.canvas.width = data.width;
  themeButton.canvas.height = data.height;
  themeButton.context = themeButton.canvas.getContext('2d');
  drawSquareButton(themeButton.context,data);
}


//--
var soundButton = {
  width: 64,
  height: 64,
  action: 'soundToggle',
  canvas: null,
  context: null
}
function createSoundButton(data){
  soundButton.posX = canvas.width-88,
  soundButton.posY = canvas.height-88,
  soundButton.canvas = document.createElement('canvas');
  soundButton.canvas.width = data.width;
  soundButton.canvas.height = data.height;
  soundButton.context = soundButton.canvas.getContext('2d');
  drawSquareButton(soundButton.context,data);
}


//--
var settingsButton = {
  width: 64,
  height: 64,
  action: 'introAnimation', //menuSettings
  canvas: null,
  context: null
}
function createSettingsButton(data){
  settingsButton.posX = 24,
  settingsButton.posY = 24,
  settingsButton.canvas = document.createElement('canvas');
  settingsButton.canvas.width = data.width;
  settingsButton.canvas.height = data.height;
  settingsButton.context = settingsButton.canvas.getContext('2d');
  drawSquareButton(settingsButton.context,data);
}


//-- button background
function drawSquareButton(context,data) {
  context.beginPath();
  context.strokeStyle = 'white';
  context.lineWidth = 4;
  context.rect(0,0,data.width,data.height);
  context.stroke();
  context.closePath();
}

//-- logo
var logo = {
  canvas: null,
  context: null,
  alpha: 1
}
function createLogo() {

  // SVG viewBox is 372x120
  var scale = 0.6;
  var width = Math.round(372 * scale);
  var height = Math.round(120 * scale);

  logo.canvas = document.createElement('canvas');
  logo.canvas.width = width;
  logo.canvas.height = height;
  logo.context = logo.canvas.getContext('2d');
  logo.width = width;
  logo.height = height;
  logo.posX = (canvas.width/2)-(logo.width/2);
  logo.posY = (canvas.height/2)-(logo.height/2)-120;

  // load SVG as image
  var img = new Image();
  img.onload = function() {
    logo.context.drawImage(img, 0, 0, width, height);
  };
  img.src = 'art/title-white.svg';
}

//-- floating island platform
var platform = {
  canvas: null,
  context: null,
  posX: null,
  posY: null,
  hover: 0,
  hoverDirection: 'up',
  time: 0
}

// floating debris rocks around the island
var floatingRocks = [];

function createPlatform() {

  var scale = 0.65;
  var fullWidth = 360;
  var fullHeight = 200;
  var width = Math.round(fullWidth * scale);
  var height = Math.round(fullHeight * scale);

  // Draw at full size first
  var fullCanvas = document.createElement('canvas');
  fullCanvas.width = fullWidth;
  fullCanvas.height = fullHeight;
  var fullContext = fullCanvas.getContext('2d');
  drawIsland(fullContext, fullWidth, fullHeight);

  // Scale down
  platform.canvas = document.createElement('canvas');
  platform.canvas.width = width;
  platform.canvas.height = height;
  platform.context = platform.canvas.getContext('2d');
  platform.context.drawImage(fullCanvas, 0, 0, width, height);
  platform.width = width;
  platform.height = height;
  platform.posX = (canvas.width/2)-(platform.width/2);
  platform.posY = (canvas.height/2)-(platform.height/2)+100;

  // create floating rocks (scaled with platform)
  floatingRocks = [
    { x: -30*scale,  y: 60*scale,  size: Math.round(12*scale), phase: 0,    speed: 0.8 },
    { x: -18*scale,  y: 90*scale,  size: Math.round(8*scale),  phase: 1.2,  speed: 1.1 },
    { x: 340*scale,  y: 55*scale,  size: Math.round(14*scale), phase: 0.5,  speed: 0.9 },
    { x: 355*scale,  y: 85*scale,  size: Math.round(7*scale),  phase: 2.0,  speed: 1.3 },
    { x: 310*scale,  y: 140*scale, size: Math.round(9*scale),  phase: 1.8,  speed: 1.0 },
    { x: 20*scale,   y: 145*scale, size: Math.round(10*scale), phase: 0.8,  speed: 0.7 },
    { x: 160*scale,  y: 170*scale, size: Math.round(6*scale),  phase: 3.0,  speed: 1.4 },
    { x: 280*scale,  y: 165*scale, size: Math.round(8*scale),  phase: 2.5,  speed: 0.6 }
  ];
}

function drawIsland(context, width, height) {
  var cx = width / 2;
  var topY = 40; // grass surface Y

  // -- rock body: steep inverted triangle, wide top tapering to sharp point
  // lightest layer (full silhouette)
  context.beginPath();
  context.moveTo(10, topY + 6);
  context.quadraticCurveTo(5, topY + 15, 20, topY + 40);
  context.quadraticCurveTo(40, topY + 70, 70, topY + 95);
  context.quadraticCurveTo(100, topY + 120, 130, topY + 135);
  context.quadraticCurveTo(155, topY + 150, cx, topY + 155);  // sharp bottom point
  context.quadraticCurveTo(205, topY + 150, 230, topY + 135);
  context.quadraticCurveTo(260, topY + 120, 290, topY + 95);
  context.quadraticCurveTo(320, topY + 70, 340, topY + 40);
  context.quadraticCurveTo(355, topY + 15, 350, topY + 6);
  context.closePath();
  context.fillStyle = 'rgba(255,255,255,0.2)';
  context.fill();

  // mid rock layer
  context.beginPath();
  context.moveTo(35, topY + 30);
  context.quadraticCurveTo(55, topY + 60, 85, topY + 90);
  context.quadraticCurveTo(115, topY + 115, 145, topY + 135);
  context.quadraticCurveTo(cx, topY + 150, 215, topY + 135);
  context.quadraticCurveTo(245, topY + 115, 275, topY + 90);
  context.quadraticCurveTo(305, topY + 60, 325, topY + 30);
  context.closePath();
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.fill();

  // deep rock layer
  context.beginPath();
  context.moveTo(75, topY + 75);
  context.quadraticCurveTo(110, topY + 110, 145, topY + 130);
  context.quadraticCurveTo(cx, topY + 150, 215, topY + 130);
  context.quadraticCurveTo(250, topY + 110, 285, topY + 75);
  context.closePath();
  context.fillStyle = 'rgba(255,255,255,0.1)';
  context.fill();

  // -- organic vein/root patterns running through rock
  context.strokeStyle = 'rgba(255,255,255,0.12)';
  context.lineWidth = 2;

  // central trunk vein
  context.beginPath();
  context.moveTo(cx, topY + 15);
  context.quadraticCurveTo(cx - 5, topY + 50, cx - 8, topY + 80);
  context.quadraticCurveTo(cx - 3, topY + 120, cx, topY + 150);
  context.stroke();

  // left branch
  context.beginPath();
  context.moveTo(cx - 8, topY + 60);
  context.quadraticCurveTo(cx - 30, topY + 75, cx - 50, topY + 70);
  context.stroke();

  // right branch
  context.beginPath();
  context.moveTo(cx - 3, topY + 80);
  context.quadraticCurveTo(cx + 20, topY + 90, cx + 45, topY + 80);
  context.stroke();

  // lower left branch
  context.beginPath();
  context.moveTo(cx - 5, topY + 100);
  context.quadraticCurveTo(cx - 25, topY + 115, cx - 35, topY + 105);
  context.stroke();

  // lower right branch
  context.beginPath();
  context.moveTo(cx, topY + 115);
  context.quadraticCurveTo(cx + 15, topY + 125, cx + 25, topY + 118);
  context.stroke();

  // -- lighter edge highlights on rock
  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 3;

  // left edge highlight
  context.beginPath();
  context.moveTo(18, topY + 20);
  context.quadraticCurveTo(30, topY + 40, 50, topY + 65);
  context.quadraticCurveTo(75, topY + 90, 100, topY + 108);
  context.stroke();

  // right edge highlight
  context.beginPath();
  context.moveTo(342, topY + 20);
  context.quadraticCurveTo(330, topY + 40, 310, topY + 65);
  context.quadraticCurveTo(285, topY + 90, 260, topY + 108);
  context.stroke();

  // -- embedded boulder with grass ring (upper-center of rock face)
  var boulderX = cx + 10;
  var boulderY = topY + 50;

  // grass ring behind boulder
  context.fillStyle = 'rgba(255,255,255,0.5)';
  context.beginPath();
  context.ellipse(boulderX, boulderY + 2, 18, 10, 0, 0, Math.PI * 2);
  context.fill();

  // grass ring dots
  context.fillStyle = 'rgba(255,255,255,0.7)';
  for (var gi = 0; gi < 10; gi++) {
    var ga = (gi / 10) * Math.PI * 2;
    var gx = boulderX + Math.cos(ga) * 16;
    var gy = boulderY + 2 + Math.sin(ga) * 8;
    context.beginPath();
    context.arc(gx, gy, 1.5, 0, Math.PI * 2);
    context.fill();
  }

  // boulder
  context.fillStyle = 'rgba(255,255,255,0.3)';
  context.beginPath();
  context.ellipse(boulderX, boulderY - 3, 12, 10, 0, 0, Math.PI * 2);
  context.fill();

  // boulder highlight
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.beginPath();
  context.ellipse(boulderX - 2, boulderY - 6, 8, 5, -0.2, 0, Math.PI * 2);
  context.fill();

  // -- grass top: thick, overhanging with dot texture
  // grass body (thick band)
  context.beginPath();
  context.moveTo(4, topY + 10);
  // left overhang droops down
  context.quadraticCurveTo(0, topY + 18, 8, topY + 22);
  context.quadraticCurveTo(20, topY + 26, 35, topY + 20);
  // underside of grass
  context.quadraticCurveTo(80, topY + 22, 130, topY + 18);
  context.lineTo(230, topY + 18);
  context.quadraticCurveTo(280, topY + 22, 325, topY + 20);
  // right overhang droops down
  context.quadraticCurveTo(340, topY + 26, 352, topY + 22);
  context.quadraticCurveTo(360, topY + 18, 356, topY + 10);
  // top surface
  context.quadraticCurveTo(340, topY - 6, 300, topY - 2);
  context.quadraticCurveTo(260, topY - 10, 220, topY - 6);
  context.quadraticCurveTo(cx, topY - 12, 140, topY - 6);
  context.quadraticCurveTo(100, topY - 10, 60, topY - 2);
  context.quadraticCurveTo(20, topY - 6, 4, topY + 10);
  context.closePath();
  context.fillStyle = 'rgba(255,255,255,0.65)';
  context.fill();

  // bright top edge
  context.beginPath();
  context.moveTo(8, topY + 6);
  context.quadraticCurveTo(40, topY - 8, 80, topY - 4);
  context.quadraticCurveTo(120, topY - 12, cx, topY - 8);
  context.quadraticCurveTo(240, topY - 12, 280, topY - 4);
  context.quadraticCurveTo(320, topY - 8, 352, topY + 6);
  // return path
  context.quadraticCurveTo(320, topY - 4, 280, topY);
  context.quadraticCurveTo(240, topY - 8, cx, topY - 4);
  context.quadraticCurveTo(120, topY - 8, 80, topY);
  context.quadraticCurveTo(40, topY - 4, 8, topY + 6);
  context.closePath();
  context.fillStyle = 'white';
  context.fill();

  // dot texture on grass surface
  context.fillStyle = 'rgba(255,255,255,0.9)';
  var dots = [
    [25,topY+4], [45,topY+2], [65,topY+6], [85,topY+3],
    [105,topY+7], [125,topY+4], [145,topY+8], [165,topY+5],
    [185,topY+8], [205,topY+5], [225,topY+8], [245,topY+4],
    [265,topY+7], [285,topY+3], [305,topY+6], [325,topY+2],
    [340,topY+5], [55,topY+10], [115,topY+12], [175,topY+11],
    [235,topY+12], [295,topY+10], [35,topY+14], [80,topY+15],
    [155,topY+14], [210,topY+15], [275,topY+14], [330,topY+12]
  ];
  for (var di = 0; di < dots.length; di++) {
    context.beginPath();
    context.arc(dots[di][0], dots[di][1], 1.2, 0, Math.PI * 2);
    context.fill();
  }

  // hanging vine/grass strands from edges
  context.strokeStyle = 'rgba(255,255,255,0.45)';
  context.lineWidth = 2;

  // left hanging strands
  context.beginPath();
  context.moveTo(12, topY + 16);
  context.quadraticCurveTo(8, topY + 32, 16, topY + 38);
  context.quadraticCurveTo(22, topY + 40, 24, topY + 34);
  context.stroke();

  context.beginPath();
  context.moveTo(30, topY + 20);
  context.quadraticCurveTo(24, topY + 30, 28, topY + 36);
  context.stroke();

  context.beginPath();
  context.moveTo(45, topY + 18);
  context.quadraticCurveTo(40, topY + 28, 44, topY + 32);
  context.stroke();

  // right hanging strands
  context.beginPath();
  context.moveTo(348, topY + 16);
  context.quadraticCurveTo(352, topY + 32, 344, topY + 38);
  context.quadraticCurveTo(338, topY + 40, 336, topY + 34);
  context.stroke();

  context.beginPath();
  context.moveTo(330, topY + 20);
  context.quadraticCurveTo(336, topY + 30, 332, topY + 36);
  context.stroke();

  context.beginPath();
  context.moveTo(315, topY + 18);
  context.quadraticCurveTo(320, topY + 28, 316, topY + 32);
  context.stroke();

  // -- grass tufts on top
  context.fillStyle = 'white';
  drawGrassTuft(context, 25, topY - 4, 10);
  drawGrassTuft(context, 55, topY - 6, 13);
  drawGrassTuft(context, 95, topY - 8, 10);
  drawGrassTuft(context, 265, topY - 8, 11);
  drawGrassTuft(context, 305, topY - 6, 12);
  drawGrassTuft(context, 340, topY - 4, 9);

  // -- character circle (sitting right of center)
  context.fillStyle = 'white';
  context.beginPath();
  context.arc(cx + 50, topY - 16, 12, 0, Math.PI * 2);
  context.fill();

  // -- campfire (left side of island)
  var fireX = cx * 0.4; // far left
  // logs
  context.fillStyle = 'rgba(255,255,255,0.5)';
  context.save();
  context.translate(fireX - 10, topY - 1);
  context.rotate(-0.3);
  context.fillRect(0, 0, 20, 4);
  context.restore();

  context.save();
  context.translate(fireX - 6, topY - 3);
  context.rotate(0.3);
  context.fillRect(0, 0, 20, 4);
  context.restore();

  // stone ring
  context.fillStyle = 'rgba(255,255,255,0.3)';
  for (var si = 0; si < 5; si++) {
    var sa = (si / 5) * Math.PI * 2;
    var sx = fireX + Math.cos(sa) * 14 - 2;
    var sy = topY + Math.sin(sa) * 5 - 1;
    context.fillRect(sx, sy, 5, 4);
  }
}

function drawGrassTuft(context, x, y, h) {
  context.beginPath();
  context.moveTo(x - 4, y);
  context.quadraticCurveTo(x - 2, y - h, x, y - h + 2);
  context.quadraticCurveTo(x + 2, y - h, x + 4, y);
  context.closePath();
  context.fill();
}

// draw a small floating rock - organic rounded shape
function drawFloatingRock(context, x, y, size) {
  context.fillStyle = 'rgba(255,255,255,0.25)';
  context.beginPath();
  context.moveTo(x - size * 0.4, y - size * 0.2);
  context.quadraticCurveTo(x - size * 0.1, y - size * 0.6, x + size * 0.3, y - size * 0.3);
  context.quadraticCurveTo(x + size * 0.5, y, x + size * 0.3, y + size * 0.3);
  context.quadraticCurveTo(x, y + size * 0.5, x - size * 0.3, y + size * 0.3);
  context.quadraticCurveTo(x - size * 0.5, y + size * 0.1, x - size * 0.4, y - size * 0.2);
  context.closePath();
  context.fill();

  // lighter top highlight
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.beginPath();
  context.moveTo(x - size * 0.3, y - size * 0.15);
  context.quadraticCurveTo(x, y - size * 0.45, x + size * 0.2, y - size * 0.2);
  context.quadraticCurveTo(x, y - size * 0.1, x - size * 0.3, y - size * 0.15);
  context.closePath();
  context.fill();
}

// animated campfire - simple glow + sparks
function drawCampfireFlames(context, cx, baseY, time, scale) {
  var s = scale || 1;
  context.save();

  // simple flickering glow
  var flicker = Math.sin(time * 3.5) * 0.15 + 0.45;
  var glowSize = 8 * s;
  context.fillStyle = 'rgba(255,255,255,' + flicker + ')';
  context.beginPath();
  context.arc(cx, baseY - glowSize * 0.5, glowSize, 0, Math.PI * 2);
  context.fill();

  // smaller bright core
  var coreFlicker = Math.sin(time * 5 + 1) * 0.1 + 0.6;
  context.fillStyle = 'rgba(255,255,255,' + coreFlicker + ')';
  context.beginPath();
  context.arc(cx, baseY - glowSize * 0.4, glowSize * 0.5, 0, Math.PI * 2);
  context.fill();

  // embers / sparks
  for (var j = 0; j < 8; j++) {
    var sparkPhase = time * 1.2 + j * 1.3;
    var sparkLife = sparkPhase % 5;
    var sparkY = baseY - 8 * s - sparkLife * 10 * s;
    var sparkX = cx + Math.sin(sparkPhase * 1.3 + j * 0.5) * 12 * s;
    var sparkAlpha = Math.max(0, 0.6 - sparkLife * 0.12);
    var sparkSize = (1.2 + Math.sin(sparkPhase) * 0.4) * s;

    context.fillStyle = 'rgba(255,255,255,' + sparkAlpha + ')';
    context.beginPath();
    context.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}


//-- placeholder actions
function menuSettings() {
  console.log('Menu-Settings');
}

function soundToggle() {
  if (gameAudio.sound === true) {
    console.log('toggleSound:OFF');
    gameAudio.volume = 0;
    gameAudio.sound = false;
    loadAudio();
  } else {
    console.log('toggleSound:ON');
    gameAudio.sound = true;
    gameAudio.volume = 0.1;
    loadAudio();
  }
}

function changeTheme() {
  console.log('changeTheme');
}

// Swipe/drag detection for mode selection
function setupMenuSwipe() {
  var el = canvas.id;

  // Mouse events
  el.addEventListener('mousedown', function(e) {
    if (gameState !== 'gameMenu') return;
    modeSelect.dragStartX = e.pageX;
    modeSelect.dragCurrentX = e.pageX;
    modeSelect.dragging = true;
    modeSelect.selectedMode = null;
  });

  el.addEventListener('mousemove', function(e) {
    if (!modeSelect.dragging || gameState !== 'gameMenu') return;
    modeSelect.dragCurrentX = e.pageX;
    var dist = modeSelect.dragCurrentX - modeSelect.dragStartX;
    if (dist < -modeSelect.swipeThreshold) {
      modeSelect.selectedMode = 'endless';
    } else if (dist > modeSelect.swipeThreshold) {
      modeSelect.selectedMode = 'platform';
    } else {
      modeSelect.selectedMode = null;
    }
  });

  el.addEventListener('mouseup', function(e) {
    if (!modeSelect.dragging || gameState !== 'gameMenu') return;
    modeSelect.dragging = false;
    if (modeSelect.selectedMode) {
      selectGameMode(modeSelect.selectedMode);
    }
    modeSelect.selectedMode = null;
  });

  // Touch events
  el.addEventListener('touchstart', function(e) {
    if (gameState !== 'gameMenu') return;
    modeSelect.dragStartX = e.touches[0].pageX;
    modeSelect.dragCurrentX = e.touches[0].pageX;
    modeSelect.dragging = true;
    modeSelect.selectedMode = null;
  }, {passive: true});

  el.addEventListener('touchmove', function(e) {
    if (!modeSelect.dragging || gameState !== 'gameMenu') return;
    modeSelect.dragCurrentX = e.touches[0].pageX;
    var dist = modeSelect.dragCurrentX - modeSelect.dragStartX;
    if (dist < -modeSelect.swipeThreshold) {
      modeSelect.selectedMode = 'endless';
    } else if (dist > modeSelect.swipeThreshold) {
      modeSelect.selectedMode = 'platform';
    } else {
      modeSelect.selectedMode = null;
    }
  }, {passive: true});

  el.addEventListener('touchend', function(e) {
    if (!modeSelect.dragging || gameState !== 'gameMenu') return;
    modeSelect.dragging = false;
    if (modeSelect.selectedMode) {
      selectGameMode(modeSelect.selectedMode);
    }
    modeSelect.selectedMode = null;
  });
}

function selectGameMode(mode) {
  gameMode = mode;
  if (mode === 'endless') {
    clearVariables();
    animateStart();
  } else if (mode === 'platform') {
    // Placeholder - platform mode not yet implemented
    console.log('Platform mode coming soon');
  }
}
