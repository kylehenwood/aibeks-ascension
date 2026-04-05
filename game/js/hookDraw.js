function drawHook(hookVariable,optional) {
  var context = hookVariable.context; // this hook variable
  var star = hookVariable.star;
  //console.log(hookData.selected);

  if (star.alive === false) {
    // this star is dead, return false;
    // ungrappel if selected
    detach();
    return;
  }
  //alert ('connected shockwave');

  // clear this canvas
  context.clearRect(0, 0, 64, 64);

  // circle
  context.beginPath();
  context.arc(star.centerX, star.centerY, star.size, 0, Math.PI*2, true);
  context.closePath();
  context.fillStyle = 'white';
  context.fill();
  context.closePath();

  // star stroke/progress
  context.beginPath();
  context.lineWidth = 1;
  context.strokeStyle = 'white';
  context.arc(star.centerX, star.centerY, star.size+star.strokeOffset, 0, Math.PI*2, true);
  context.closePath();
  context.stroke();

  var radius = 23;
  var startAngle = 2 * Math.PI;
  var endAngle; //var endAngle = ring * Math.PI
  var counterClockwise = true;

  // drain star
  if (hookVariable.selected === true && star.safe === false && star.alive === true && character.swinging === true) {
    if (debugImmunityEnabled) {
      starImmunity.power += 1*dt;
    }
    if (debugStarDecayEnabled) {
      star.ring -= debugStarDecayRate*dt;
    }
    if (star.ring <= 0 && star.alive === true && debugStarsCanDie) {
      star.alive = false;
    }
  }

  // gets updated when character is swinging from it
  endAngle = star.ring * Math.PI;

  context.beginPath();
  context.lineWidth = 3;
  context.strokeStyle = 'red';
  context.arc(star.centerX, star.centerY, radius, startAngle, endAngle, counterClockwise);
  context.stroke();
  context.closePath();

  // visual bounds
  // gonna need a switch statement
  if (hookVariable.selected === true && star.alive === true) {
    context.strokeStyle = 'lime';
    context.lineWidth = 2;
  } else {
    context.strokeStyle = 'red';
    context.lineWidth = 1;
  }
  if (star.safe === true) {
    context.lineWidth = 3;
    context.strokeStyle = 'cyan';
  }

  context.beginPath();
  context.rect(star.centerX-(star.bounds/2),star.centerY-(star.bounds/2),star.bounds,star.bounds);

  if (star.alive === false) {
    context.fillStyle = 'red';
    context.fill();
  }
  context.stroke();
}
