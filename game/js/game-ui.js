var guiAlpha = 0;

// Interface --------------------
function updateInterface() {
  canvas.context.textBaseline="middle";
  fpsCounter(canvas.context);

  if (gameState === 'playGame') {
    if (guiAlpha < 1) {
      guiAlpha += 0.02;
    }
  } else {
    if (guiAlpha > 0) {
      guiAlpha -= 0.02;
    }
  }


  if (gameState === 'playGame') {
    canvas.context.save();
    canvas.context.globalAlpha = guiAlpha;
    scoreCounter(canvas.context);
    canvas.context.restore();
  }

  // Debug: character overlay (toggled via debug panel)
  if (debugCharacterDebug) {
    drawCharacterDebug(canvas.context);
  }
}

function drawCharacterDebug(context) {
  context.save();
  context.fillStyle = 'rgba(0,0,0,0.5)';
  context.fillRect(camera.width - 260, camera.height - 170, 248, 160);
  context.fillStyle = 'white';
  context.font = '16px monospace';
  context.textBaseline = 'top';
  context.textAlign = 'left';
  var x = camera.width - 248;
  var y = camera.height - 162;
  context.fillText('charX: ' + Math.round(character.centerX), x, y);
  context.fillText('charY: ' + Math.round(character.centerY), x, y + 20);
  context.fillText('camX:  ' + Math.round(camera.x), x, y + 40);
  context.fillText('camY:  ' + Math.round(camera.y), x, y + 60);
  context.fillText('VX:    ' + Math.round(physics.vx), x, y + 80);
  context.fillText('VY:    ' + Math.round(physics.vy), x, y + 100);
  context.fillText('state: ' + gameState, x, y + 120);
  context.fillText('phase: ' + restartPhase, x, y + 140);
  context.restore();
}

// fps display
var lastCalledTime;
var fps;
function fpsCounter(context) {
  if(!lastCalledTime) {
     lastCalledTime = performance.now();
     fps = 0;
     return;
  }
  delta = (performance.now() - lastCalledTime)/1000;
  lastCalledTime = performance.now();
  fps = Math.round(1/delta);

  context.fillStyle = 'white';
  context.textBaseline="top";
  context.textAlign="left";
  context.font = '24px sans-serif';
  context.fillText('FPS: '+fps, 24, 24);
}

function scoreCounter(context) {
  context.fillStyle = 'white';
  context.textBaseline="top";
  context.textAlign="right";
  context.font = '24px sans-serif';
  context.fillText('DISTANCE: '+gameUserInterface.score+'m', camera.width-24, 24);
}
