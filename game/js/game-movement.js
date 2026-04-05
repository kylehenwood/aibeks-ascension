// Draw rope & calculate swing
function drawRope(context) {

  var hookX = selectedHook.centerX;
  var hookY = selectedHook.centerY;

  // update swing direction
  if (momentiumIncrease > 0) {
    swingDirection = 'right';
  } else {
    swingDirection = 'left';
  }

  // different swing methods
  additiveSwing();

  // Rope length and positions
  var ropeLength = trajectory.hypotenuse;
  var sideY = Math.cos(momentiumAngle)*ropeLength;
  var sideX = Math.sin(momentiumAngle)*ropeLength;

  // calculate rope XY now I know the positions
  var ropeY = hookY + sideY;
  var ropeX = hookX + sideX;

  // update character position to where the rope ends
  character.centerX = ropeX;
  character.centerY = ropeY;

  context.beginPath();
  context.lineWidth = 2;
  context.moveTo(character.centerX,character.centerY);

  //-------------------------
  context.lineTo(hookX,hookY);
  context.strokeStyle = 'red';
  context.stroke();
  context.closePath();
}

function additiveSwing() {
  if (momentiumAngle <= 0) {
    // set speed maximum
    if (momentiumIncrease < 2.8) {
        momentiumIncrease+=swingSpeed*dt;
    }
  } else {
    // set speed maximum
    if (momentiumIncrease > -2.8) {
      momentiumIncrease-=swingSpeed*dt;
    }
  }
  currentAngle += momentiumIncrease*dt;
  momentiumAngle = toRad(currentAngle);
}


function drawTrajectory(context){
  // triangle of calculations
  context.strokeStyle = 'magenta';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(trajectory.characterPosX,trajectory.characterPosY);  // startPointX, startPointY
  context.lineTo(trajectory.starPosX,trajectory.starPosY); // HookX,HookY
  context.lineTo(trajectory.starPosX,trajectory.characterPosY); // startPointY, HookX
  context.closePath();    // hypotinuse
  context.stroke();

  // calculate hypotenuse === radius, draw circle on currentHook center
  context.beginPath();
  context.arc(trajectory.starPosX, trajectory.starPosY, trajectory.hypotenuse, 0, 2 * Math.PI, false);
  context.lineWidth = 2;
  context.strokeStyle = 'yellow';
  context.stroke();
}
