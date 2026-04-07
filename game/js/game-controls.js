// each hook created also pushes its click area into this array
var elements = [];
var elem;

function setMouseVariables() {
  elem = canvas.id;
  var viewportOffset = elem.getBoundingClientRect();
  // the problem...
  elem.left = viewportOffset.left;
  elem.top = viewportOffset.top;
}

// mouseTestSetup;
function mouseTestSetup() {

  setMouseVariables();

  // add event listener for clicks on canvas.
  elem.addEventListener('click', function(event) {
    // Map screen pixels to canvas coordinates (accounts for CSS scaling)
    var rect = elem.getBoundingClientRect();
    var scaleX = camera.width / rect.width;
    var scaleY = camera.height / rect.height;
    var mouseX = (event.pageX - rect.left) * scaleX;
    var mouseY = (event.pageY - rect.top) * scaleY;

    // every click, check to see if click is over any of the elements in the elements array.
    // if yes, get the index of that element, and set the current hook to that
    switch(gameState) {
      case "playGame":
        playClick(mouseX,mouseY);
        break;
      case "gamePaused":
        pauseClick(mouseX,mouseY);
        break;
      case "gameResume":
        resumeClick(mouseX,mouseY);
        break;
      case "gameOver":
        gameOverClick(mouseX,mouseY);
        break;
      case "gameIntro":
        introClick(mouseX,mouseY);
        break;
      case "gameMenu":
        menuClick(mouseX,mouseY);
        break;
      default: return;
    }
    //console.log(gameState);
  });
}

// GAMESTATE: PLAY
// every click, check to see if click is over any of the elements in the elements array.
// if yes, get the index of that element, and set the current hook to that
function playClick(mouseX,mouseY) {
  if (gameState === "playGame") {

    // check to see if user clicked anything, if this stays false through all clicks, detach from hook.
    var clickedSomething = false;

    // Find the closest star to the click point (prevents overlapping click areas)
    var closestDist = Infinity;
    var closestIndex = -1;

    elements.forEach(function(element) {
      if (mouseY > element.posY && mouseY < element.posY+element.size
        && mouseX > element.posX+camera.x*parallax.gamePanel && mouseX < element.posX+camera.x*parallax.gamePanel+element.size) {
        // Get center of this element's star
        var centerX = element.posX + camera.x*parallax.gamePanel + element.size / 2;
        var centerY = element.posY + element.size / 2;
        var dx = mouseX - centerX;
        var dy = mouseY - centerY;
        var dist = dx * dx + dy * dy;
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = element.index;
        }
      }
    });

    if (closestIndex >= 0) {
      clickedSomething = true;
      changeHook(closestIndex);
    }
    // paused button
    if (mouseY > camera.height-80 && mouseX < 80) {
      clickedSomething = true;
      gamePause();
    }

    if (clickedSomething === false) {
      detach();
    }
  }
}


// GAMESTATE: PLAY || PAUSED
function pauseClick(mouseX,mouseY) {
  pauseElems.forEach(function(element) {
    if (mouseY > element.posY && mouseY < element.posY+element.height && mouseX > element.posX && mouseX < element.posX+element.width) {
      var action = element.action;
      window[action]();
    }
  });
}

// allow click of pause button during resume state
function resumeClick(mouseX,mouseY) {
  if (mouseY > camera.height-80 && mouseX < 80) {
    gamePause();
  }
}


// Game menu
function menuClick(mouseX,mouseY) {
  // if intro.ended === false;
  // skipIntro(), intro.ended = true
  menuElems.forEach(function(element) {
    if (mouseY > element.posY && mouseY < element.posY+element.height && mouseX > element.posX && mouseX < element.posX+element.width) {
      var action = element.action;
      window[action]();
    }
  });
}

// Game intro
function introClick(mouseX,mouseY) {
  // if intro.ended === false;
  // skipIntro(), intro.ended = true
}


// game over
function gameOverClick(mouseX,mouseY) {
  gameOverElems.forEach(function(element) {
    if (mouseY > element.posY && mouseY < element.posY+element.height && mouseX > element.posX && mouseX < element.posX+element.width) {
      var action = element.action;
      window[action]();
    }
  });
}



// draw this on own canvas and render once as a group every frame, rather than loop
var clickAreas = {
  canvas: null,
  context: null
}

function drawClicky() {
  var clickCanvas = document.createElement('canvas');
      clickCanvas.width = gamePanel.canvas.width;
      clickCanvas.height = gamePanel.canvas.height;
  var clickContext = clickCanvas.getContext('2d'); // Pass the context to draw the star

  clickAreas.canvas = clickCanvas;
  clickAreas.context = clickContext;

  elements.forEach(function(element) {
    //element.posX+camera.x;
    clickContext.fillStyle = 'rgba(0,255,0,0.1)';
    clickContext.fillRect(element.posX, element.posY, element.size, element.size);
  });
}


// controls
// holds the value of currently selected hook, on hook change
// this value should be placed back into starhooks array.
// while the new selected hook should be found here.
function controls() {
  document.addEventListener('keydown', function(event) {
  //$(document).keydown(function(e) {
      switch(event.which) {
          case 37: // left
          //changeHook('key',-1);
          break;

          case 38: // up
          break;

          case 39: // right
          //changeHook('key',1);
          break;

          case 32: // spacebar
          if (gameState === "playGame") {
            detach();
          }
          break;

          case 40: // down
          break;

          case 82 && 17: // ctrl + r
          location.reload();
          break;

          case 82: // R (restart)
          if (gameState === "playGame" || gameState === "gameOver") {
            restartGame();
          }
          break;

          case 80: // P (pause)
          if (gameState === "gamePaused" || gameState === "playGame") {
            gamePause();
          }
          break;

          default: return; // exit this handler for other keys
      }
      event.preventDefault(); // prevent the default action (scroll / move caret)
  }, false);
}
