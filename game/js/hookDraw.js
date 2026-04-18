// Unified star drawing — shared design language across all star types.
// Color signals type; structure is always the same:
//   1. White center dot
//   2. Faint static outer ring (always visible, type-colored)
//   3. Bold progress border (visible when connected, type-colored)
//      - Standard (safe, not immune): white, stays full (doesn't decay)
//      - Immune    (safe + immune):   cyan,  stays full, reveals only on connect
//      - Ratchet   (!safe):           red,   depletes while connected
//   Shooting stars are drawn separately in shooting-star.js (yellow).

var DEATH_COLOR = '#ff3838';

function drawHook(hookVariable, optional) {
  var context = hookVariable.context;
  var star = hookVariable.star;

  if (star.alive === false) {
    return;
  }

  // Shooting stars manage their own canvas via drawShootingStarHooks —
  // their life is tied to animation progress, not grapple interaction.
  if (star.shooting) return;

  context.clearRect(0, 0, 64, 64);

  var cx = star.centerX; // 32
  var cy = star.centerY; // 32
  var R  = star.size + star.strokeOffset; // 22

  // ── Dying stars: render red + supernova implosion only ──
  if (star.dying) {
    star.deathProgress = (star.deathProgress || 0) + dt * 0.025;
    drawStarSupernova(context, star, cx, cy, R);
    if (star.deathProgress >= 1) {
      star.alive = false;
    }
    return;
  }

  // ── Determine type ──
  var isImmune = !!star.immune;
  var typeColor = isImmune ? '#40e0ff' : '#30c040';

  // ── 1. Center dot — always white ──
  context.beginPath();
  context.arc(cx, cy, star.size, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();

  // ── 2. Faint static outer ring (always visible) ──
  context.beginPath();
  context.arc(cx, cy, R, 0, Math.PI * 2);
  context.lineWidth = 1;
  context.strokeStyle = typeColor;
  context.globalAlpha = 0.25;
  context.stroke();
  context.globalAlpha = 1;

  // ── 3. Decay / charge logic (runs only when selected + swinging) ──
  var connected = hookVariable.selected && star.alive && character.swinging;

  if (connected) {
    // Accumulate star charge (shared mechanic)
    if (typeof starCharge !== 'undefined' && starCharge.power < starCharge.maxPower) {
      starCharge.power += starCharge.rate * dt;
      if (starCharge.power >= starCharge.maxPower) {
        starCharge.power = starCharge.maxPower;
        starCharge.charged = true;
      }
    }

    // Standard (non-immune) stars decay when connected
    if (!isImmune) {
      if (typeof debugImmunityEnabled !== 'undefined' && debugImmunityEnabled) {
        starImmunity.power += 1 * dt;
      }
      if (typeof debugStarDecayEnabled !== 'undefined' && debugStarDecayEnabled) {
        star.ring -= debugStarDecayRate * dt;
      }
      if (star.ring <= 0 && star.alive && !star.dying) {
        if (typeof debugStarsCanDie !== 'undefined' && debugStarsCanDie) {
          startStarDeath(star, hookVariable);
        }
      }
    }
  }

  // ── 4. Bold progress border ──
  if (isImmune) {
    // Cyan 2px full ring — only visible when connected
    if (connected) {
      context.beginPath();
      context.arc(cx, cy, R, 0, Math.PI * 2);
      context.lineWidth = 2;
      context.strokeStyle = typeColor;
      context.stroke();
    }
  } else {
    // Depleting arc — color shifts from green → red as the ring drains
    var endAngle = star.ring * Math.PI;
    if (endAngle > 0) {
      var drainT = Math.max(0, Math.min(1, 1 - star.ring / 2)); // 0 = full, 1 = empty
      var arcColor = drainT < 0.5 ? typeColor : DEATH_COLOR;
      context.beginPath();
      context.arc(cx, cy, R, 2 * Math.PI, endAngle, true);
      context.lineWidth = 3;
      context.strokeStyle = arcColor;
      context.stroke();
    }
  }

  // ── Debug bounds box ──
  if (typeof sandbox !== 'undefined' && sandbox.debugMode) {
    var isSelected = hookVariable.selected === true && star.alive === true;
    context.strokeStyle = isSelected ? 'lime' : 'red';
    context.lineWidth   = isSelected ? 2 : 1;
    context.beginPath();
    context.rect(star.centerX - star.bounds / 2, star.centerY - star.bounds / 2, star.bounds, star.bounds);
    if (!star.alive) {
      context.fillStyle = 'rgba(255,0,0,0.3)';
      context.fill();
    }
    context.stroke();
  }
}


// Initialize the dying state + supernova particles.
// Called once when a star's ring hits 0.
function startStarDeath(star, hookVariable) {
  star.dying = true;
  star.deathProgress = 0;
  star.deathParticles = [];
  var count = 18;
  for (var i = 0; i < count; i++) {
    star.deathParticles.push({
      angle: (i / count) * Math.PI * 2 + Math.random() * 0.3,
      startDist: 24 + Math.random() * 6,
      size: 1 + Math.random() * 1.4,
      spin: 1.5 + Math.random()
    });
  }
  // Release the player if they were grappled to this star
  if (typeof selectedHook !== 'undefined' && selectedHook === hookVariable) {
    if (typeof detach === 'function') detach();
  }
}


// Supernova implosion — contained within the 64×64 hook canvas.
//   Phase 1 (0 → 0.50): rings + particles spiral inward, core intensifies
//   Phase 2 (0.50 → 0.65): white-hot flash at center
//   Phase 3 (0.65 → 1.00): expanding shockwave dissipates
function drawStarSupernova(ctx, star, cx, cy, R) {
  var t = Math.min(1, star.deathProgress);

  if (t < 0.5) {
    var phase = t / 0.5;
    var inward = 1 - phase;

    // Contracting outer ring
    ctx.strokeStyle = 'rgba(255, 70, 50, ' + (0.7 * inward + 0.15) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 28 * inward, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary trailing ring
    ctx.strokeStyle = 'rgba(255, 140, 70, ' + (0.4 * inward) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * inward, 0, Math.PI * 2);
    ctx.stroke();

    // Particles spiraling in
    if (star.deathParticles) {
      for (var i = 0; i < star.deathParticles.length; i++) {
        var p = star.deathParticles[i];
        var dist = p.startDist * inward;
        var angle = p.angle + phase * p.spin;
        var px = cx + Math.cos(angle) * dist;
        var py = cy + Math.sin(angle) * dist;
        ctx.fillStyle = 'rgba(255, 110, 60, ' + (0.9 * inward) + ')';
        ctx.beginPath();
        ctx.arc(px, py, p.size * (0.5 + inward * 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Red core intensifies as matter implodes
    var coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, star.size + 3 * phase);
    coreGrad.addColorStop(0, 'rgba(255, 200, 120, ' + (0.6 + phase * 0.4) + ')');
    coreGrad.addColorStop(1, 'rgba(255, 60, 40, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, star.size + 3 * phase, 0, Math.PI * 2);
    ctx.fill();

  } else if (t < 0.65) {
    // Flash
    var phase2 = (t - 0.5) / 0.15;
    var flashAlpha = Math.sin(phase2 * Math.PI);
    var flashRadius = 4 + phase2 * 20;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashRadius);
    grad.addColorStop(0, 'rgba(255, 255, 255, ' + flashAlpha + ')');
    grad.addColorStop(0.35, 'rgba(255, 220, 140, ' + flashAlpha * 0.9 + ')');
    grad.addColorStop(0.75, 'rgba(255, 100, 50, ' + flashAlpha * 0.4 + ')');
    grad.addColorStop(1, 'rgba(255, 60, 40, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, flashRadius, 0, Math.PI * 2);
    ctx.fill();

  } else {
    // Shockwave
    var phase3 = (t - 0.65) / 0.35;
    var radius = 10 + phase3 * 22;
    var alpha = (1 - phase3) * 0.7;
    ctx.strokeStyle = 'rgba(255, 90, 40, ' + alpha + ')';
    ctx.lineWidth = 2 * (1 - phase3) + 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner trailing wave
    ctx.strokeStyle = 'rgba(255, 200, 120, ' + alpha * 0.5 + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }
}
