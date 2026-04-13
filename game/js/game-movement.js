// Draw rope & calculate swing using Verlet physics
function drawRope(context) {
  physicsUpdateRope(dt);
  physicsDrawRope(context);
  physicsUpdateSparkles(dt, context);
}


// Grapple Assist: draw release quality arc around the star.
// Computes how far the character would travel toward the next star in
// sequence if released at each angle. Green = toward next star, red = away.
function drawGrappleAssist(context) {
  if (!physics.ropeActive || !selectedHook) { physics._assistBestAngle = null; return; }

  // Find the next alive star after the current one
  var idx = selectedHook.star.index;
  var nextStar = null;
  for (var i = idx + 1; i < starHooks.length; i++) {
    if (starHooks[i].star.alive) { nextStar = starHooks[i]; break; }
  }
  if (!nextStar) return;

  var rope = physics.rope;
  var last = rope[rope.length - 1];
  var hook = rope[0];

  // Current rope length
  var rdx = last.x - hook.x;
  var rdy = last.y - hook.y;
  var R = Math.sqrt(rdx * rdx + rdy * rdy);
  if (R < 1) return;

  // Direction from current star toward next star (unit vector)
  var toNextX = nextStar.centerX - hook.x;
  var toNextY = nextStar.centerY - hook.y;
  var toNextDist = Math.sqrt(toNextX * toNextX + toNextY * toNextY);
  if (toNextDist < 1) return;
  var dirX = toNextX / toNextDist;
  var dirY = toNextY / toNextDist;

  // Angular velocity from Verlet positions
  var curAngle = Math.atan2(last.y - hook.y, last.x - hook.x);
  var prevAngle = Math.atan2(last.oy - hook.y, last.ox - hook.x);
  var omega = curAngle - prevAngle;
  if (omega > Math.PI) omega -= 2 * Math.PI;
  if (omega < -Math.PI) omega += 2 * Math.PI;

  var g = physics.GRAVITY;
  var fallLimit = camera.height;
  var sinCur = Math.sin(curAngle);
  var curSpeedSq = R * R * omega * omega;
  // Swing direction: +1 = counterclockwise, -1 = clockwise
  var swingDir = omega >= 0 ? 1 : -1;

  // Energy gate — angle θ reachable when speed² >= 0
  // speed² = curSpeedSq + 2gR(sin(θ) - sin(current))
  // reachable when sin(θ) >= sin(current) - curSpeedSq/(2gR)
  var energyFloor = sinCur - curSpeedSq / (2 * g * R);
  var fullRotation = energyFloor <= -1;

  // Always compute travel for the forward (rightward) pass through each angle,
  // regardless of current swing direction. This keeps the arc shape stable.
  // Forward pass direction: pick the swing dir that produces positive vx
  // at the bottom of the arc (theta = PI/2). vx = -dir * speed * sin(PI/2) = -dir * speed.
  // For vx > 0 we need dir = -1.
  var fwdDir = -1;

  var samples = 72;
  var step = (2 * Math.PI) / samples;
  var travel = [];
  var speeds = [];
  var maxPos = 0;
  var maxNeg = 0;
  var maxSpeed = 0;

  for (var i = 0; i < samples; i++) {
    var theta = i * step;
    var sinT = Math.sin(theta);

    // Skip angles the pendulum can't reach
    if (!fullRotation && sinT < energyFloor) {
      travel.push(0);
      speeds.push(0);
      continue;
    }

    // Speed at this angle via energy conservation
    var speedSq = curSpeedSq + 2 * g * R * (sinT - sinCur);
    if (speedSq < 0) { travel.push(0); speeds.push(0); continue; }
    var speed = Math.sqrt(speedSq);
    speeds.push(speed);
    if (speed > maxSpeed) maxSpeed = speed;

    // Tangent velocity for the forward (rightward) pass
    var vx = -fwdDir * speed * Math.sin(theta);
    var vy = fwdDir * speed * Math.cos(theta);

    var py = hook.y + R * sinT;
    var fallHeight = fallLimit - py;
    if (fallHeight <= 0) { travel.push(0); continue; }

    // Solve 0.5*g*t^2 + vy*t - fallHeight = 0 for positive t
    var disc = vy * vy + 2 * g * fallHeight;
    if (disc < 0) { travel.push(0); continue; }
    var t = (-vy + Math.sqrt(disc)) / g;
    if (t < 0) t = 0;

    // Net displacement from release point
    var dx = vx * t;
    var dy = vy * t + 0.5 * g * t * t;

    // Project displacement onto direction toward next star
    var proj = dx * dirX + dy * dirY;
    travel.push(proj);
    if (proj > maxPos) maxPos = proj;
    if (proj < maxNeg) maxNeg = proj;
  }

  if (maxPos === 0 && maxNeg === 0) return;

  // Find the best release angle (highest positive travel toward next star)
  var bestIdx = -1;
  var bestVal = 0;
  for (var i = 0; i < samples; i++) {
    if (travel[i] > bestVal) {
      bestVal = travel[i];
      bestIdx = i;
    }
  }
  if (bestVal <= 0) { physics._assistBestAngle = null; return; }

  // Expose best angle for autoplay
  physics._assistBestAngle = bestIdx * step;

  // Color blend based on current swing direction.
  // Forward swing (vx > 0) → green, backswing → red.
  // Transition smoothly using actual vx relative to peak forward speed.
  var peakSpeed = maxSpeed > 0 ? maxSpeed : 1;
  var rawBlend = Math.max(-1, Math.min(1, physics.vx / peakSpeed));
  // Map [-1,1] to [0,1]: -1 (full backswing) → 0, +1 (peak forward) → 1
  var blend = (rawBlend + 1) * 0.5;
  // Smoothstep for gradual transition
  blend = blend * blend * (3 - 2 * blend);
  var arcR = Math.round(255 * (1 - blend));
  var arcG = Math.round(255 * blend);

  // Draw the forward release zone — always visible, colored by blend
  for (var i = 0; i < samples; i++) {
    var val = travel[i];
    if (val <= 0) continue;

    // Fade by speed — near turning points speed is ~0, so arc fades out
    var speedFade = maxSpeed > 0 ? (speeds[i] / maxSpeed) : 0;
    var t = val / bestVal;
    var alpha = t * t * t * speedFade * 0.5;
    var theta = i * step;

    context.beginPath();
    context.arc(hook.x, hook.y, R, theta - step * 0.6, theta + step * 0.6);
    context.lineWidth = 4;
    context.strokeStyle = 'rgba(' + arcR + ', ' + arcG + ', 0, ' + alpha + ')';
    context.stroke();
  }

  // Cyan marker at the optimal release point — forward swing only
  if (bestIdx >= 0 && physics.vx > 0) {
    var bestAngle = bestIdx * step;
    var angleDelta = curAngle - bestAngle;
    if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
    if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
    var pastBest = angleDelta * swingDir > 0;

    if (!pastBest) {
      var bx = hook.x + R * Math.cos(bestAngle);
      var by = hook.y + R * Math.sin(bestAngle);

      context.beginPath();
      context.arc(bx, by, 5, 0, 2 * Math.PI);
      context.fillStyle = 'cyan';
      context.fill();
    }
  }
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
