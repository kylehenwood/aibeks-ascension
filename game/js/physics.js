// Verlet Rope Physics Engine
// Replaces the old angular swing model with position-based dynamics.
// The rope is a chain of points: point[0] pinned to hook, point[N-1] = character.
// Gravity acts on all points. Distance constraints keep segments at fixed length.

var physics = {
  // Character velocity (pixels per frame at 60fps)
  vx: 0,
  vy: 0,

  // Tuning constants
  GRAVITY: 0.4,
  TERMINAL_VELOCITY: 15,
  ROPE_SEGMENTS: 8,
  ROPE_ITERATIONS: 3,
  DAMPING: 1,
  ROPE_MIN_LENGTH: 80,     // minimum total rope length in pixels (0 = no minimum)
  RATCHET: 0.7,            // how aggressively the rope shortens when character is close (0 = off, 1 = instant)
  RATCHET_MAX: 1,          // max ratchet shortening as fraction of initial rope length (0 = no shortening, 1 = can shorten to zero)
  GRAPPLE_EASE: 2,         // easing power for grapple animation (1 = linear, >1 = accelerates)
  ELASTICITY: 1,           // rope stiffness (0 = fully elastic/stretchy, 1 = rigid). Stretches more with momentum
  RIGIDITY: 0.25,          // straightens the rope (0 = fully flexible, 1 = perfectly straight beam)
  RETRACT_PERCENT: 0.1,   // how much the rope shortens on connect (0-1)
  RETRACT_SPEED: 0.15,    // lerp speed per frame toward target length
  SPARKLE_RATE: 0.1,      // chance per rope point per frame to emit a sparkle (0 = off, 1 = every frame)
  SPARKLE_LIFE: 70,       // how many frames sparkles last before fully fading

  // Verlet rope state — array of {x, y, ox, oy}
  rope: [],
  ropeActive: false,
  attachTimestamp: 0,       // Date.now() when rope attached

  // Sparkle particles — array of {x, y, life, maxLife, size}
  sparkles: [],

  // Computed on attach
  segmentLength: 0,
  initialSegmentLength: 0,
  targetSegmentLength: 0
};


// Initialize the rope between hook and character.
// Encodes current physics.vx/vy into the character endpoint's old-position
// so Verlet integration naturally continues the incoming velocity.
function physicsInitRope(hookX, hookY, charX, charY) {
  var segments = physics.ROPE_SEGMENTS;
  var dx = charX - hookX;
  var dy = charY - hookY;
  var dist = Math.sqrt(dx * dx + dy * dy);

  // Rope length = actual distance to hook, no cap
  var ropeLen = dist || 1;
  var fullSegLen = ropeLen / (segments - 1);
  var minSegLen = physics.ROPE_MIN_LENGTH / (segments - 1);
  // Retract scales with grapple ease — faster snap = more retract
  var effectiveRetract = Math.min(physics.RETRACT_PERCENT * physics.GRAPPLE_EASE, 0.9);
  physics.segmentLength = fullSegLen;
  physics.initialSegmentLength = fullSegLen;
  physics.targetSegmentLength = Math.max(fullSegLen * (1 - effectiveRetract), minSegLen);

  var endX = charX;
  var endY = charY;

  physics.rope = [];
  for (var i = 0; i < segments; i++) {
    var t = i / (segments - 1);
    var px = hookX + (endX - hookX) * t;
    var py = hookY + (endY - hookY) * t;

    if (i === segments - 1) {
      // Character endpoint: encode velocity into old-position
      physics.rope.push({
        x: px,
        y: py,
        ox: px - physics.vx,
        oy: py - physics.vy
      });
    } else {
      // Interior / hook points: no initial velocity
      physics.rope.push({
        x: px,
        y: py,
        ox: px,
        oy: py
      });
    }
  }

  physics.ropeActive = true;
  physics.attachTimestamp = Date.now();
}


// Step the Verlet simulation one frame.
// Called every frame while character.swinging === true.
function physicsUpdateRope(dt) {
  if (!physics.ropeActive || physics.rope.length === 0) return;

  // Elastic retract — gradually shorten rope toward target length
  if (physics.segmentLength > physics.targetSegmentLength) {
    physics.segmentLength += (physics.targetSegmentLength - physics.segmentLength) * physics.RETRACT_SPEED * dt;
    if (physics.segmentLength < physics.targetSegmentLength) {
      physics.segmentLength = physics.targetSegmentLength;
    }
  }

  var rope = physics.rope;
  var grav = physics.GRAVITY * dt * dt;
  var damp = physics.DAMPING;

  // 1. Verlet integration (skip point 0 — it's pinned to the hook)
  for (var i = 1; i < rope.length; i++) {
    var p = rope[i];
    var tempX = p.x;
    var tempY = p.y;
    p.x += (p.x - p.ox) * damp;
    p.y += (p.y - p.oy) * damp + grav;
    p.ox = tempX;
    p.oy = tempY;
  }

  // 2. Pin point 0 to hook
  if (selectedHook != null) {
    rope[0].x = selectedHook.centerX;
    rope[0].y = selectedHook.centerY;
    rope[0].ox = rope[0].x;
    rope[0].oy = rope[0].y;
  }

  // 3. Distance constraints with elasticity
  //    Stiffness scales inversely with character momentum — faster = stretchier
  var speed = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);
  var momentumScale = Math.min(speed / 10, 1); // 0 at rest, 1 at high speed
  var stiffness = physics.ELASTICITY + (1 - physics.ELASTICITY) * (1 - momentumScale);
  var segLen = physics.segmentLength;
  for (var iter = 0; iter < physics.ROPE_ITERATIONS; iter++) {
    for (var i = 0; i < rope.length - 1; i++) {
      var a = rope[i];
      var b = rope[i + 1];
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      var diff = (dist - segLen) / dist * stiffness;
      var offsetX = dx * diff * 0.5;
      var offsetY = dy * diff * 0.5;

      if (i === 0) {
        // Point 0 is pinned — full correction to point 1
        b.x -= offsetX * 2;
        b.y -= offsetY * 2;
      } else {
        a.x += offsetX;
        a.y += offsetY;
        b.x -= offsetX;
        b.y -= offsetY;
      }
    }
  }

  // 4. Rigidity — lerp interior points toward the straight line between hook and character
  //    Gradually applies after 400ms of being attached (ramps up over 600ms)
  if (physics.RIGIDITY > 0) {
    var elapsed = Date.now() - physics.attachTimestamp;
    var delay = 400;
    var rampDuration = 600;

    if (elapsed > delay) {
      var rampT = Math.min((elapsed - delay) / rampDuration, 1);
      var rig = physics.RIGIDITY * rampT;

      var p0 = rope[0];
      var pN = rope[rope.length - 1];
      for (var i = 1; i < rope.length - 1; i++) {
        var t = i / (rope.length - 1);
        var idealX = p0.x + (pN.x - p0.x) * t;
        var idealY = p0.y + (pN.y - p0.y) * t;
        rope[i].x += (idealX - rope[i].x) * rig;
        rope[i].y += (idealY - rope[i].y) * rig;
      }
    }
  }

  // 5. Sparkle emission — spawn particles from rope points
  if (physics.SPARKLE_RATE > 0) {
    for (var i = 0; i < rope.length; i++) {
      if (Math.random() < physics.SPARKLE_RATE) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 0.1 + Math.random() * 0.3;
        physics.sparkles.push({
          x: rope[i].x + (Math.random() - 0.5) * 6,
          y: rope[i].y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: physics.SPARKLE_LIFE,
          maxLife: physics.SPARKLE_LIFE,
          size: 0.3 + Math.random() * 0.7
        });
      }
    }
  }

  // 6. Ratchet — if character is closer to hook than current rope length, shorten toward that distance
  var last = rope[rope.length - 1];
  var hook = rope[0];
  var rdx = last.x - hook.x;
  var rdy = last.y - hook.y;
  var directDist = Math.sqrt(rdx * rdx + rdy * rdy);
  var currentRopeLen = physics.segmentLength * (rope.length - 1);
  var minSegLen = physics.ROPE_MIN_LENGTH / (rope.length - 1);
  var ratchetFloor = physics.initialSegmentLength * (1 - physics.RATCHET_MAX);
  var floorSeg = Math.max(ratchetFloor, minSegLen);
  if (physics.RATCHET > 0 && directDist < currentRopeLen) {
    var targetSeg = Math.max(directDist / (rope.length - 1), floorSeg);
    // Lerp toward the shorter length based on ratchet strength
    physics.segmentLength += (targetSeg - physics.segmentLength) * physics.RATCHET * dt;
    if (physics.segmentLength < targetSeg) physics.segmentLength = targetSeg;
    // Also pull the retract target down if needed
    if (physics.targetSegmentLength > physics.segmentLength) {
      physics.targetSegmentLength = physics.segmentLength;
    }
  }

  // 7. Extract character position and implicit Verlet velocity
  character.centerX = last.x;
  character.centerY = last.y;
  physics.vx = last.x - last.ox;
  physics.vy = last.y - last.oy;
}


// Called on detach — velocity is already stored in physics.vx/vy
// from the last physicsUpdateRope call.
function physicsDetach() {
  physics.ropeActive = false;
  physics.rope = [];
  // sparkles stay — they'll fade out naturally
}


// Draw the rope as connected line segments through all Verlet points.
function physicsDrawRope(context) {
  if (!physics.ropeActive || physics.rope.length < 2) return;

  var rope = physics.rope;
  context.beginPath();
  context.lineWidth = 2;
  context.strokeStyle = 'red';
  context.moveTo(rope[0].x, rope[0].y);
  for (var i = 1; i < rope.length; i++) {
    context.lineTo(rope[i].x, rope[i].y);
  }
  context.stroke();
  context.closePath();
}


// Update and draw sparkle particles. Called every frame (even when rope is inactive, to fade out remaining sparkles).
function physicsUpdateSparkles(dt, context) {
  var sparkles = physics.sparkles;
  for (var i = sparkles.length - 1; i >= 0; i--) {
    var s = sparkles[i];
    s.life -= dt;
    if (s.life <= 0) {
      sparkles.splice(i, 1);
      continue;
    }
    // Drift slowly in random direction
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    var t = s.life / s.maxLife; // 1 → 0
    var alpha = t * t; // ease out — fades gently then vanishes
    var radius = s.size * (0.5 + t * 0.5); // shrinks slightly

    context.save();
    context.globalAlpha = alpha * 0.8;
    context.fillStyle = '#ffffff';
    context.shadowColor = 'rgba(200, 220, 255, 0.6)';
    context.shadowBlur = 3;
    context.beginPath();
    context.arc(s.x, s.y, radius, 0, 2 * Math.PI);
    context.fill();
    context.restore();
  }
}
