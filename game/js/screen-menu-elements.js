// buttons on the introduction screen

var playButton = {
  width: 240,
  height: 64,
  posX: null,
  posY: null,
  action: 'animateStart',
  canvas: null,
  context: null,
  progress: 0,
  hover: false,
  pressed: false,
  alpha: 0,
  hoverT: 0
}

// Menu mouse state — tracks cursor in canvas coordinates
var menuMouse = { x: 0, y: 0, canvasX: 0, canvasY: 0, active: false };

function setupMenuMouse() {
  var el = canvas.id;

  function toCanvas(e) {
    var rect = el.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width) - camera.offsetX,
      y: (e.clientY - rect.top) * (canvas.height / rect.height) - camera.offsetY
    };
  }

  function updateHover(pos) {
    menuMouse.canvasX = pos.x;
    menuMouse.canvasY = pos.y;
    // Normalized -1 to 1 for cloud parallax
    menuMouse.x = (pos.x / camera.width) * 2 - 1;
    menuMouse.y = (pos.y / camera.height) * 2 - 1;
    menuMouse.active = true;

    if (gameState !== 'gameMenu') return;
    playButton.hover = (
      pos.x >= playButton.posX &&
      pos.x <= playButton.posX + playButton.width &&
      pos.y >= playButton.posY &&
      pos.y <= playButton.posY + playButton.height
    );
    el.style.cursor = playButton.hover ? 'pointer' : '';
  }

  el.addEventListener('mousemove', function(e) {
    updateHover(toCanvas(e));
  });

  el.addEventListener('mousedown', function(e) {
    if (gameState !== 'gameMenu') return;
    var pos = toCanvas(e);
    updateHover(pos);
    if (playButton.hover) {
      playButton.pressed = true;
    }
  });

  el.addEventListener('mouseup', function() {
    playButton.pressed = false;
  });

  el.addEventListener('mouseleave', function() {
    playButton.hover = false;
    playButton.pressed = false;
    menuMouse.active = false;
  });
}
function createPlayButton(data){
  playButton.posX = (camera.width/2)-(240/2),
  playButton.posY = (camera.height/2)+240,

  playButton.canvas = document.createElement('canvas');
  playButton.canvas.width = data.width;
  playButton.canvas.height = data.height;
  playButton.context = playButton.canvas.getContext('2d');
  setPlayButton();
}

function updatePlayButton() {
  var context = playButton.context;

  if (playButton.progress === 0) {
    playButton.progress = 1;
  } else {
    if (playButton.progress < 99.5) {
      var progress = animateEaseOut(100, playButton.progress, 18);
      playButton.progress += progress;
    } else {
      playButton.progress = 100;
    }
  }

  var t = playButton.progress / 100;
  var lineMax = 160;
  var width = lineMax * t;
  var offset = (playButton.width / 2) - (width / 2);

  // Smooth alpha curves
  var lineAlpha = Math.min(t * 2, 1);
  var textT = Math.max(0, (t - 0.25) / 0.75);
  var textAlpha = textT * textT * (3 - 2 * textT); // smoothstep
  context.clearRect(0, 0, playButton.width, playButton.height);

  // Line — grows from center + fades in
  context.save();
  context.globalAlpha = lineAlpha;
  context.fillStyle = 'white';
  context.fillRect(offset, playButton.height / 2 + 8, width, 4);
  context.restore();

  // Text — fades in
  if (textAlpha > 0) {
    context.save();
    context.globalAlpha = textAlpha;
    context.fillStyle = 'white';
    context.font = 'bold 18px sans-serif';
    context.textBaseline = 'bottom';
    context.textAlign = 'center';
    context.fillText('CLICK TO START', playButton.width / 2, playButton.height / 2 - 4);
    context.restore();
  }
}

function setPlayButton() {

  playButton.progress = 0;
  renderPlayButton();
}

// Outro animation — reverse of intro. ease goes 0→1 over the transition.
function drawPlayButtonOutro(context, ease) {
  var lineProgress = 1 - ease;
  var lineAlpha = 1 - ease;
  var textT = Math.min(ease * 2.5, 1);
  var textAlpha = 1 - textT * textT * (3 - 2 * textT); // inverse smoothstep

  var lineMax = 160;
  var w = lineMax * lineProgress;
  var offset = (playButton.width / 2) - (w / 2);
  var x = playButton.posX;
  var y = playButton.posY;

  // Line shrinking from edges to center + fading out
  if (w > 0 && lineAlpha > 0) {
    context.save();
    context.globalAlpha = lineAlpha;
    context.fillStyle = 'white';
    context.fillRect(x + offset, y + playButton.height / 2 + 8, w, 4);
    context.restore();
  }

  // Text fading out
  if (textAlpha > 0) {
    context.save();
    context.globalAlpha = textAlpha;
    context.fillStyle = 'white';
    context.font = 'bold 18px sans-serif';
    context.textBaseline = 'bottom';
    context.textAlign = 'center';
    context.fillText('CLICK TO START', x + playButton.width / 2, y + playButton.height / 2 - 4);
    context.restore();
  }
}

function renderPlayButton() {
  var context = playButton.context;
  var pressOffset = playButton.pressed ? 3 : 0;

  context.clearRect(0, 0, playButton.width, playButton.height);

  // button text (shifts down on press)
  context.fillStyle = 'white';
  context.font = 'bold 18px sans-serif';
  context.textBaseline = 'bottom';
  context.textAlign = 'center';
  context.fillText('CLICK TO START', playButton.width / 2, playButton.height / 2 - 4 + pressOffset);

  // line below text (stays put)
  var lineMax = 160;
  var lineOffset = (playButton.width - lineMax) / 2;
  context.fillRect(lineOffset, playButton.height / 2 + 8, lineMax, 4);
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
  modeSelect.canvas.width = camera.width;
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
  themeButton.posX = camera.width-88,
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
  soundButton.posX = camera.width-88,
  soundButton.posY = camera.height-88,
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
  var scale = 0.72;
  var width = Math.round(372 * scale);
  var height = Math.round(120 * scale);

  logo.canvas = document.createElement('canvas');
  logo.canvas.width = width;
  logo.canvas.height = height;
  logo.context = logo.canvas.getContext('2d');
  logo.width = width;
  logo.height = height;
  logo.posX = (camera.width/2)-(logo.width/2);
  logo.posY = (camera.height/2)-(logo.height/2)-120;

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

  var scale = 0.5;
  var fullWidth = 320;
  var fullHeight = 340;
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
  platform.posX = (camera.width/2)-(platform.width/2);
  platform.posY = (camera.height/2)-(platform.height/2)+120;

  // create floating rocks — orbit around platform center
  var cx = width / 2;
  var cy = height / 2;
  floatingRocks = [
    { radius: 100*scale, angle: 0,    size: Math.round(22*scale), orbitSpeed: 0.08, bobPhase: 0,   bobSpeed: 0.7 },
    { radius: 120*scale, angle: 0.9,  size: Math.round(16*scale), orbitSpeed: 0.06, bobPhase: 1.2, bobSpeed: 0.9 },
    { radius: 105*scale, angle: 1.8,  size: Math.round(24*scale), orbitSpeed: 0.07, bobPhase: 0.5, bobSpeed: 0.8 },
    { radius: 130*scale, angle: 2.7,  size: Math.round(14*scale), orbitSpeed: 0.05, bobPhase: 2.0, bobSpeed: 1.1 },
    { radius: 140*scale, angle: 3.6,  size: Math.round(18*scale), orbitSpeed: 0.09, bobPhase: 1.8, bobSpeed: 0.6 },
    { radius: 110*scale, angle: 4.5,  size: Math.round(13*scale), orbitSpeed: 0.07, bobPhase: 0.8, bobSpeed: 1.0 },
    { radius: 150*scale, angle: 5.4,  size: Math.round(10*scale), orbitSpeed: 0.06, bobPhase: 3.0, bobSpeed: 1.2 }
  ];
}

function drawIsland(context, width, height) {
  var cx = width / 2;
  var topY = 50; // grass surface Y
  var bottomY = height - 10; // sharp bottom point

  // -- rock body: tall narrow inverted triangle, wide top tapering to a sharp point
  // lightest layer (full silhouette)
  context.beginPath();
  context.moveTo(15, topY + 8);
  context.quadraticCurveTo(10, topY + 30, 30, topY + 70);
  context.quadraticCurveTo(50, topY + 120, 80, topY + 170);
  context.quadraticCurveTo(110, topY + 210, 135, topY + 240);
  context.quadraticCurveTo(cx - 10, bottomY + 5, cx, bottomY); // sharp bottom
  context.quadraticCurveTo(cx + 10, bottomY + 5, 185, topY + 240);
  context.quadraticCurveTo(210, topY + 210, 240, topY + 170);
  context.quadraticCurveTo(270, topY + 120, 290, topY + 70);
  context.quadraticCurveTo(310, topY + 30, 305, topY + 8);
  context.closePath();
  context.fillStyle = '#413a59';
  context.fill();

  // mid rock layer
  context.beginPath();
  context.moveTo(40, topY + 40);
  context.quadraticCurveTo(60, topY + 90, 90, topY + 145);
  context.quadraticCurveTo(120, topY + 195, 140, topY + 230);
  context.quadraticCurveTo(cx, bottomY, 180, topY + 230);
  context.quadraticCurveTo(200, topY + 195, 230, topY + 145);
  context.quadraticCurveTo(260, topY + 90, 280, topY + 40);
  context.closePath();
  context.fillStyle = '#5e5872';
  context.fill();

  // deep rock layer (near the tip)
  context.beginPath();
  context.moveTo(80, topY + 120);
  context.quadraticCurveTo(110, topY + 180, 140, topY + 230);
  context.quadraticCurveTo(cx, bottomY, 180, topY + 230);
  context.quadraticCurveTo(210, topY + 180, 240, topY + 120);
  context.closePath();
  context.fillStyle = '#6e6980';
  context.fill();

  // -- vein/crack patterns through the rock
  context.strokeStyle = '#585373';
  context.lineWidth = 2;

  // central vein
  context.beginPath();
  context.moveTo(cx, topY + 20);
  context.quadraticCurveTo(cx - 6, topY + 80, cx - 8, topY + 140);
  context.quadraticCurveTo(cx - 3, topY + 220, cx, bottomY);
  context.stroke();

  // left branch
  context.beginPath();
  context.moveTo(cx - 8, topY + 80);
  context.quadraticCurveTo(cx - 35, topY + 100, cx - 55, topY + 90);
  context.stroke();

  // right branch
  context.beginPath();
  context.moveTo(cx - 5, topY + 130);
  context.quadraticCurveTo(cx + 25, topY + 145, cx + 45, topY + 130);
  context.stroke();

  // lower branches
  context.beginPath();
  context.moveTo(cx - 5, topY + 170);
  context.quadraticCurveTo(cx - 25, topY + 185, cx - 30, topY + 175);
  context.stroke();

  context.beginPath();
  context.moveTo(cx, topY + 200);
  context.quadraticCurveTo(cx + 18, topY + 215, cx + 22, topY + 205);
  context.stroke();

  // -- edge highlights
  context.strokeStyle = '#4e4865';
  context.lineWidth = 3;

  context.beginPath();
  context.moveTo(22, topY + 25);
  context.quadraticCurveTo(40, topY + 60, 60, topY + 110);
  context.quadraticCurveTo(85, topY + 160, 110, topY + 195);
  context.stroke();

  context.beginPath();
  context.moveTo(298, topY + 25);
  context.quadraticCurveTo(280, topY + 60, 260, topY + 110);
  context.quadraticCurveTo(235, topY + 160, 210, topY + 195);
  context.stroke();

  // -- grass top: thick overhanging layer
  context.beginPath();
  context.moveTo(6, topY + 12);
  // left overhang
  context.quadraticCurveTo(2, topY + 20, 10, topY + 24);
  context.quadraticCurveTo(25, topY + 28, 40, topY + 22);
  // underside
  context.quadraticCurveTo(90, topY + 24, 130, topY + 20);
  context.lineTo(190, topY + 20);
  context.quadraticCurveTo(230, topY + 24, 280, topY + 22);
  // right overhang
  context.quadraticCurveTo(295, topY + 28, 310, topY + 24);
  context.quadraticCurveTo(318, topY + 20, 314, topY + 12);
  // top surface undulation
  context.quadraticCurveTo(300, topY - 6, 260, topY - 2);
  context.quadraticCurveTo(220, topY - 10, cx, topY - 8);
  context.quadraticCurveTo(100, topY - 10, 60, topY - 2);
  context.quadraticCurveTo(20, topY - 6, 6, topY + 12);
  context.closePath();
  context.fillStyle = '#cccbd3';
  context.fill();

  // bright top edge
  context.beginPath();
  context.moveTo(10, topY + 6);
  context.quadraticCurveTo(40, topY - 8, 80, topY - 4);
  context.quadraticCurveTo(120, topY - 12, cx, topY - 8);
  context.quadraticCurveTo(200, topY - 12, 240, topY - 4);
  context.quadraticCurveTo(280, topY - 8, 310, topY + 6);
  context.quadraticCurveTo(280, topY - 4, 240, topY);
  context.quadraticCurveTo(200, topY - 8, cx, topY - 4);
  context.quadraticCurveTo(120, topY - 8, 80, topY);
  context.quadraticCurveTo(40, topY - 4, 10, topY + 6);
  context.closePath();
  context.fillStyle = 'white';
  context.fill();

  // hanging vine strands
  context.strokeStyle = '#8d899b';
  context.lineWidth = 2;

  context.beginPath();
  context.moveTo(14, topY + 18);
  context.quadraticCurveTo(10, topY + 34, 18, topY + 40);
  context.quadraticCurveTo(24, topY + 42, 26, topY + 36);
  context.stroke();

  context.beginPath();
  context.moveTo(35, topY + 22);
  context.quadraticCurveTo(30, topY + 34, 34, topY + 38);
  context.stroke();

  context.beginPath();
  context.moveTo(300, topY + 18);
  context.quadraticCurveTo(306, topY + 34, 298, topY + 40);
  context.quadraticCurveTo(292, topY + 42, 290, topY + 36);
  context.stroke();

  context.beginPath();
  context.moveTo(285, topY + 22);
  context.quadraticCurveTo(290, topY + 34, 286, topY + 38);
  context.stroke();

  // -- character circle (sitting right of center)
  context.fillStyle = 'white';
  context.beginPath();
  context.arc(cx + 45, topY - 16, 12, 0, Math.PI * 2);
  context.fill();

  // -- campfire (left of center)
  var fireX = cx - 50;
  context.fillStyle = '#b8b5c4';
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
  context.fillStyle = '#a09dae';
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

// Draw all floating rocks around the platform at a given Y position.
// parallaxY is an optional offset that gets scaled by 1.8 (closer to camera than platform).
// Draw floating rocks orbiting the platform center.
// platX/platY = top-left of platform on screen.
function drawFloatingRocks(context, platY, parallaxY, platX) {
  var px = (platX !== undefined) ? platX : platform.posX;
  var centerX = px + platform.width / 2;
  var centerY = platY + platform.height / 2;

  for (var i = 0; i < floatingRocks.length; i++) {
    var rock = floatingRocks[i];
    var a = rock.angle + platform.time * rock.orbitSpeed;
    var rx = centerX + Math.cos(a) * rock.radius;
    var ry = centerY + Math.sin(a) * rock.radius * 0.5; // squash Y for elliptical orbit
    var bob = Math.sin(platform.time * rock.bobSpeed + rock.bobPhase) * 3;
    drawFloatingRock(context, rx, ry + bob, rock.size);
  }
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

  // Clip to top half only (above baseY)
  context.beginPath();
  context.rect(cx - 40 * s, baseY - 60 * s, 80 * s, 60 * s);
  context.clip();

  // simple flickering glow
  var flicker = Math.sin(time * 3.5) * 0.15 + 0.45;
  var glowSize = 8 * s;
  context.fillStyle = 'rgba(255,255,255,' + flicker + ')';
  context.beginPath();
  context.arc(cx, baseY, glowSize, 0, Math.PI * 2);
  context.fill();

  // smaller bright core
  var coreFlicker = Math.sin(time * 5 + 1) * 0.1 + 0.6;
  context.fillStyle = 'rgba(255,255,255,' + coreFlicker + ')';
  context.beginPath();
  context.arc(cx, baseY, glowSize * 0.5, 0, Math.PI * 2);
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
