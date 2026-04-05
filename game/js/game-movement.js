// Draw rope & calculate swing using Verlet physics
function drawRope(context) {
  physicsUpdateRope(dt);
  physicsDrawRope(context);
  physicsUpdateSparkles(dt, context);
}


// Debug: draw rope points and velocity vector
function drawTrajectory(context) {
  if (!physics.ropeActive) return;

  // Draw each rope point as a dot
  var rope = physics.rope;
  for (var i = 0; i < rope.length; i++) {
    context.beginPath();
    context.arc(rope[i].x, rope[i].y, 4, 0, 2 * Math.PI, false);
    context.fillStyle = (i === 0) ? 'cyan' : (i === rope.length - 1) ? 'yellow' : 'magenta';
    context.fill();
  }

  // Draw velocity vector from character
  var last = rope[rope.length - 1];
  context.beginPath();
  context.moveTo(last.x, last.y);
  context.lineTo(last.x + physics.vx * 10, last.y + physics.vy * 10);
  context.strokeStyle = 'lime';
  context.lineWidth = 2;
  context.stroke();
}
