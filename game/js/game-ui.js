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
    valueIndicator(canvas.context);
    canvas.context.restore();
  }
}

function valueIndicator(context) {
  context.fillStyle = 'white';
  context.font = '24px sans-serif';
  //context.fillText('Val: '+momentiumAngle, 16, camera.height-24);

  context.textBaseline="bottom";
  context.textAlign="right";
  context.fillText(Math.round(physics.vx,2)+' :VX', camera.width-24, camera.height-56);
  context.fillText(Math.round(physics.vy,2)+' :VY', camera.width-24, camera.height-24);
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
