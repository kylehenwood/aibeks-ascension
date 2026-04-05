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

  // hover animation
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
  var hoverY = platform.posY + platform.hover;

  // Position character on the platform surface
  character.centerX = platform.posX + platform.width / 2;
  character.centerY = hoverY + 26 - character.size / 2;

  // title (behind platform)
  context.drawImage(logo.canvas, logo.posX, logo.posY);

  // floating rocks (bob independently)
  for (var i = 0; i < floatingRocks.length; i++) {
    var rock = floatingRocks[i];
    var rockBob = Math.sin(platform.time * rock.speed + rock.phase) * 4;
    drawFloatingRock(context, platform.posX + rock.x, hoverY + rock.y + rockBob, rock.size);
  }

  // floating platform
  context.drawImage(platform.canvas, platform.posX, hoverY);

  // animated campfire flames
  var fireCx = platform.posX + platform.width * 0.2;
  var fireBaseY = hoverY + 28;
  drawCampfireFlames(context, fireCx, fireBaseY, platform.time, 1.6);

  // Draw character on platform (same size as gameplay)
  drawCharacter(context);

  // intro buttons (disabled for now)
  // context.drawImage(themeButton.canvas, themeButton.posX, themeButton.posY);
  // context.drawImage(soundButton.canvas, soundButton.posX, soundButton.posY);
  // context.drawImage(settingsButton.canvas, settingsButton.posX, settingsButton.posY);

  // play button
  context.drawImage(playButton.canvas, playButton.posX, playButton.posY);
}
