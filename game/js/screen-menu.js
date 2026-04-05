// Game Menu
// moves background and foreground...

var gameMenu = {
  canvas: null,
  context: null,
}

var menuElems = [];

function setupMenu() {
  gameState = 'gameMenu';
  character.centerX = canvas.width/2;
}

// create the pause overlay
function createMenu() {
  gameMenu.canvas = document.createElement('canvas');
  gameMenu.canvas.width = canvas.width;
  gameMenu.canvas.height = canvas.height;
  gameMenu.context = gameMenu.canvas.getContext('2d');

  // intro elements
  createPlayButton(playButton);
  menuElems.push(playButton);

  // createSettingsButton(settingsButton);
  // menuElems.push(settingsButton);

  // createSoundButton(soundButton);
  // menuElems.push(soundButton);

  // createThemeButton(themeButton);
  // menuElems.push(themeButton);

  createLogo();
  createPlatform();
}

// pause state
function updateMenu() {
  //context = canvas.context;
  var context = gameMenu.context;

  context.clearRect(0, 0, canvas.width, canvas.height);

  // Position character on the platform surface
  var hoverY = platform.posY + platform.hover;
  character.centerX = platform.posX + platform.width / 2;
  character.centerY = hoverY + 26 - character.size / 2;

  // title (behind platform)
  context.drawImage(logo.canvas, logo.posX, logo.posY);

  // platform scene (drawn by RAF, not here — we just draw logo, character, buttons)
  drawPlatformScene(context);

  // Draw character on platform
  drawCharacter(context);

  // intro buttons (disabled for now)
  // context.drawImage(themeButton.canvas, themeButton.posX, themeButton.posY);
  // context.drawImage(soundButton.canvas, soundButton.posX, soundButton.posY);
  // context.drawImage(settingsButton.canvas, settingsButton.posX, settingsButton.posY);

  // play button
  context.drawImage(playButton.canvas, playButton.posX, playButton.posY);
}

// Unified platform drawing — called every frame in all game states.
// cameraOffset is the current camera.y during transitions (0 when settled).
// The platform gets a foreground parallax multiplier so it feels closer to camera.
function drawPlatformScene(context, cameraOffset) {
  // hover animation (always ticks)
  if (platform.hoverDirection === 'up' && platform.hover <= 0) {
    platform.hoverDirection = 'down';
  }
  if (platform.hoverDirection === 'down' && platform.hover >= 5) {
    platform.hoverDirection = 'up';
  }
  if (platform.hoverDirection === 'up') {
    platform.hover -= 0.024 * dt;
  } else {
    platform.hover += 0.024 * dt;
  }
  platform.time += 0.016 * dt;

  var offset = cameraOffset || 0;
  var platY = platform.posY + platform.hover + offset * parallax.platform;

  // floating rocks — closer parallax than platform
  drawFloatingRocks(context, platY, offset, platform.posX);

  // platform
  context.drawImage(platform.canvas, platform.posX, platY);

  // campfire flames
  var fireCx = platform.posX + platform.width * 0.3;
  var fireBaseY = platY + 32;
  drawCampfireFlames(context, fireCx, fireBaseY, platform.time, 1.6);
}
