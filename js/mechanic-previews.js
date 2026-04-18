// Landing-page mechanic previews.
//
// Each <canvas data-mechanic="..."> hosts a small self-contained animation
// that demonstrates one star type. No dependency on the main game engine —
// these are simple, decorative loops. Colors mirror the design language:
//   grapple  (standard) → green (#40e070), shifts red near empty
//   immune              → cyan  (#40e0ff), never depletes
//   shooting            → yellow (#ffc840), depletes as it travels

(function () {
  var canvases = document.querySelectorAll('canvas[data-mechanic]');
  if (!canvases.length) return;

  var COLOR_STANDARD = '#40e070';
  var COLOR_IMMUNE   = '#40e0ff';
  var COLOR_SHOOTING = '#ffc840';
  var COLOR_DEATH    = '#ff3838';

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255);
  }
  var RGB_STANDARD = hexToRgb(COLOR_STANDARD);
  var RGB_IMMUNE   = hexToRgb(COLOR_IMMUNE);
  var RGB_SHOOTING = hexToRgb(COLOR_SHOOTING);
  var RGB_DEATH    = hexToRgb(COLOR_DEATH);

  function Preview(el) {
    this.el = el;
    this.ctx = el.getContext('2d');
    this.kind = el.dataset.mechanic;
    this.visible = true;
    this.bgStars = [];
    this.w = 0;
    this.h = 0;
    this.resize();
    this.reset();
  }

  Preview.prototype.resize = function () {
    var dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    var rect = this.el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    this.w = rect.width;
    this.h = rect.height;
    this.el.width = Math.round(rect.width * dpr);
    this.el.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seedBgStars();
  };

  Preview.prototype.seedBgStars = function () {
    var count = Math.max(18, Math.round(this.w * this.h / 7000));
    this.bgStars = [];
    for (var i = 0; i < count; i++) {
      this.bgStars.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: 0.4 + Math.random() * 1.2,
        a: 0.12 + Math.random() * 0.55,
        vx: 0.003 + Math.random() * 0.012,
        tw: Math.random() * Math.PI * 2,
        twv: 0.001 + Math.random() * 0.003
      });
    }
  };

  Preview.prototype.reset = function () {
    if (this.kind === 'grapple') {
      this.state = {
        ring: 2,
        swingT: Math.PI * 0.5,
        phase: 'swinging',
        deathProg: 0,
        deathParticles: null,
        restT: 0,
        releaseAngle: 0,
        charX: 0,
        charY: 0,
        charVX: 0,
        charVY: 0,
        charFade: 1
      };
    } else if (this.kind === 'immune') {
      this.state = {
        swingT: Math.PI * 0.5,
        pulse: 0
      };
    } else if (this.kind === 'shooting') {
      this.state = {
        progress: 0,
        trail: [],
        restT: 0,
        phase: 'running'
      };
    }
  };

  Preview.prototype.drawBg = function (dt) {
    var ctx = this.ctx;
    for (var i = 0; i < this.bgStars.length; i++) {
      var s = this.bgStars[i];
      s.x -= s.vx * dt;
      if (s.x < -2) { s.x = this.w + 2; s.y = Math.random() * this.h; }
      s.tw += s.twv * dt;
      var tw = 0.65 + Math.sin(s.tw) * 0.35;
      ctx.fillStyle = 'rgba(255,255,255,' + (s.a * tw).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Draw a standard-style star (center dot + faint outer ring + progress arc).
  // opts: { ring, color, deathRed, immune, connected, R, dotR, progressAlpha }
  Preview.prototype.drawStar = function (cx, cy, opts) {
    var ctx = this.ctx;
    var R = opts.R || 22;
    var dotR = opts.dotR || 5.5;
    var color = opts.color;
    var rgb = opts.rgb;

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Faint static outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + rgb + ', 0.28)';
    ctx.stroke();

    // Progress arc
    if (opts.immune) {
      if (opts.connected) {
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
    } else {
      var fill = Math.max(0, Math.min(1, opts.ring / 2));
      if (fill > 0) {
        var start = -Math.PI / 2;
        var end   = start + fill * Math.PI * 2;
        var drain = 1 - fill; // 0 full → 1 empty
        var arcColor = drain < 0.5 ? color : COLOR_DEATH;
        ctx.beginPath();
        ctx.arc(cx, cy, R, start, end, false);
        ctx.lineWidth = 3;
        ctx.strokeStyle = arcColor;
        ctx.stroke();
      }
    }

    // Soft outer glow when connected
    if (opts.connected) {
      var grd = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 2.6);
      grd.addColorStop(0, 'rgba(' + rgb + ', 0.18)');
      grd.addColorStop(1, 'rgba(' + rgb + ', 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Tiny supernova for the grapple preview.
  Preview.prototype.drawSupernova = function (cx, cy, t, particles) {
    var ctx = this.ctx;
    if (t < 0.5) {
      var phase = t / 0.5;
      var inward = 1 - phase;
      ctx.strokeStyle = 'rgba(255, 70, 50, ' + (0.7 * inward + 0.15) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 28 * inward, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 140, 70, ' + (0.4 * inward) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 20 * inward, 0, Math.PI * 2);
      ctx.stroke();
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var dist = p.startDist * inward;
        var angle = p.angle + phase * p.spin;
        var px = cx + Math.cos(angle) * dist;
        var py = cy + Math.sin(angle) * dist;
        ctx.fillStyle = 'rgba(255, 110, 60, ' + (0.9 * inward) + ')';
        ctx.beginPath();
        ctx.arc(px, py, p.size * (0.5 + inward * 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (t < 0.65) {
      var phase2 = (t - 0.5) / 0.15;
      var flashAlpha = Math.sin(phase2 * Math.PI);
      var flashRadius = 4 + phase2 * 22;
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
      var phase3 = (t - 0.65) / 0.35;
      var radius = 12 + phase3 * 28;
      var alpha = (1 - phase3) * 0.7;
      ctx.strokeStyle = 'rgba(255, 90, 40, ' + alpha + ')';
      ctx.lineWidth = 2 * (1 - phase3) + 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  Preview.prototype.drawTether = function (x1, y1, x2, y2, alpha) {
    var ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (alpha || 0.55) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  Preview.prototype.drawCharacter = function (x, y, alpha) {
    var ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    // Soft halo
    var grd = ctx.createRadialGradient(x, y, 0, x, y, 14);
    grd.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // ─── Grapple (standard star) ────────────────────────────────────────────
  Preview.prototype.tickGrapple = function (dt) {
    var s = this.state;
    var cx = this.w * 0.5;
    var cy = this.h * 0.34;
    var L  = Math.min(this.h * 0.42, this.w * 0.42);
    var connected = (s.phase === 'swinging');

    if (s.phase === 'swinging') {
      s.swingT += 0.0028 * dt;
      s.ring -= 0.00032 * dt;
      if (s.ring <= 0) {
        s.ring = 0;
        s.phase = 'dying';
        s.deathProg = 0;
        // freeze char at current swing position, give it a tangential velocity
        var angle = Math.sin(s.swingT) * 0.95;
        s.releaseAngle = angle;
        s.charX = cx + L * Math.sin(angle);
        s.charY = cy + L * Math.cos(angle);
        // angular velocity ≈ dθ/dt
        var angVel = 0.95 * Math.cos(s.swingT) * 0.0028;
        // tangential direction = (cos(angle), -sin(angle)) * L * angVel
        s.charVX = L * angVel * Math.cos(angle);
        s.charVY = -L * angVel * Math.sin(angle);
        s.charFade = 1;
        s.deathParticles = [];
        for (var i = 0; i < 18; i++) {
          s.deathParticles.push({
            angle: (i / 18) * Math.PI * 2 + Math.random() * 0.3,
            startDist: 24 + Math.random() * 6,
            size: 1 + Math.random() * 1.4,
            spin: 1.5 + Math.random()
          });
        }
      }
    } else if (s.phase === 'dying') {
      s.deathProg += 0.0022 * dt;
      // Character falls off
      s.charVY += 0.0006 * dt;
      s.charX += s.charVX * dt;
      s.charY += s.charVY * dt;
      s.charFade = Math.max(0, s.charFade - 0.003 * dt);
      if (s.deathProg >= 1) {
        s.phase = 'rest';
        s.restT = 0;
      }
    } else if (s.phase === 'rest') {
      s.restT += dt;
      if (s.restT > 700) {
        // Respawn
        s.ring = 2;
        s.swingT = Math.PI * 0.5;
        s.phase = 'swinging';
        s.charFade = 1;
      }
    }

    this.drawBg(dt);

    // Tether + character while swinging
    if (s.phase === 'swinging') {
      var angleNow = Math.sin(s.swingT) * 0.95;
      var chx = cx + L * Math.sin(angleNow);
      var chy = cy + L * Math.cos(angleNow);
      this.drawTether(cx, cy, chx, chy, 0.55);
      this.drawCharacter(chx, chy, 1);
    } else if (s.phase === 'dying') {
      if (s.charFade > 0.01) this.drawCharacter(s.charX, s.charY, s.charFade);
    }

    // Star / supernova
    if (s.phase === 'dying') {
      this.drawSupernova(cx, cy, s.deathProg, s.deathParticles);
    } else if (s.phase === 'rest') {
      // empty — star is gone, brief pause before respawn
    } else {
      this.drawStar(cx, cy, {
        ring: s.ring,
        color: COLOR_STANDARD,
        rgb: RGB_STANDARD,
        immune: false,
        connected: connected,
        R: 22,
        dotR: 5.5
      });
    }
  };

  // ─── Immune (cyan) ──────────────────────────────────────────────────────
  Preview.prototype.tickImmune = function (dt) {
    var s = this.state;
    s.swingT += 0.0022 * dt;
    s.pulse += 0.002 * dt;

    var cx = this.w * 0.5;
    var cy = this.h * 0.34;
    var L  = Math.min(this.h * 0.42, this.w * 0.42);
    var angle = Math.sin(s.swingT) * 0.85;
    var chx = cx + L * Math.sin(angle);
    var chy = cy + L * Math.cos(angle);

    this.drawBg(dt);

    this.drawTether(cx, cy, chx, chy, 0.55);
    this.drawCharacter(chx, chy, 1);

    this.drawStar(cx, cy, {
      ring: 2,
      color: COLOR_IMMUNE,
      rgb: RGB_IMMUNE,
      immune: true,
      connected: true,
      R: 22,
      dotR: 5.5
    });
  };

  // ─── Shooting (yellow, moving) ──────────────────────────────────────────
  Preview.prototype.tickShooting = function (dt) {
    var s = this.state;

    // Region = inset of canvas; diagonal path top-left → bottom-right
    var padX = this.w * 0.14;
    var padY = this.h * 0.14;
    var startX = padX, startY = padY;
    var endX = this.w - padX, endY = this.h - padY;

    if (s.phase === 'running') {
      s.progress += 0.00045 * dt;
      if (s.progress >= 1) {
        s.progress = 1;
        s.phase = 'rest';
        s.restT = 0;
      }
    } else {
      s.restT += dt;
      // let trail fade
      if (s.restT > 500 && s.trail.length === 0) {
        s.progress = 0;
        s.phase = 'running';
      }
    }

    var t = s.progress;
    var x = startX + (endX - startX) * t;
    var y = startY + (endY - startY) * t;

    // Add trail particle while running
    if (s.phase === 'running') {
      s.trail.push({ x: x, y: y, life: 600, max: 600 });
      if (s.trail.length > 60) s.trail.shift();
    }
    // Fade trail
    for (var j = s.trail.length - 1; j >= 0; j--) {
      var p = s.trail[j];
      p.life -= dt;
      if (p.life <= 0) s.trail.splice(j, 1);
    }

    this.drawBg(dt);

    // Region outline — subtle dashed box to signal the star's path domain
    var ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 200, 64, 0.12)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1;
    ctx.strokeRect(startX - 14, startY - 14, (endX - startX) + 28, (endY - startY) + 28);
    ctx.restore();

    // Trail
    for (var i = 0; i < s.trail.length; i++) {
      var tp = s.trail[i];
      var pt = tp.life / tp.max;
      var alpha = pt * pt * 0.55;
      ctx.fillStyle = 'rgba(255, 220, 120, ' + alpha + ')';
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 1.8 * pt + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Character hanging behind the star (slight up-left lag)
    if (s.phase === 'running') {
      var lagDx = -(endX - startX) * 0.06;
      var lagDy =  (endY - startY) * 0.10;
      var chx = x + lagDx;
      var chy = y + lagDy;
      this.drawTether(x, y, chx, chy, 0.4);
      this.drawCharacter(chx, chy, Math.min(1, t * 12));
    }

    // Star with yellow progress arc draining as it travels
    var remaining = 1 - t; // 1 at start, 0 at end
    var fadeIn = Math.min(t / 0.05, 1);
    var appearanceAlpha = fadeIn * (s.phase === 'rest' ? Math.max(0, 1 - s.restT / 300) : 1);

    ctx.save();
    ctx.globalAlpha = appearanceAlpha;
    // Center dot
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // Faint static ring
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(' + RGB_SHOOTING + ', 0.55)';
    ctx.stroke();
    // Progress arc (remaining power)
    var start = -Math.PI / 2;
    var end   = start + remaining * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x, y, 22, start, end, false);
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR_SHOOTING;
    ctx.stroke();
    // Glow
    var grd = ctx.createRadialGradient(x, y, 6, x, y, 60);
    grd.addColorStop(0, 'rgba(' + RGB_SHOOTING + ', 0.25)');
    grd.addColorStop(1, 'rgba(' + RGB_SHOOTING + ', 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  Preview.prototype.tick = function (dt) {
    this.ctx.clearRect(0, 0, this.w, this.h);
    if (this.kind === 'grapple')       this.tickGrapple(dt);
    else if (this.kind === 'immune')   this.tickImmune(dt);
    else if (this.kind === 'shooting') this.tickShooting(dt);
  };

  // ── Boot ──────────────────────────────────────────────────────────────
  var previews = [];
  for (var i = 0; i < canvases.length; i++) {
    previews.push(new Preview(canvases[i]));
  }

  // Pause offscreen previews (CPU saver).
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        for (var j = 0; j < previews.length; j++) {
          if (previews[j].el === e.target) {
            previews[j].visible = e.isIntersecting;
            break;
          }
        }
      }
    }, { threshold: 0.05 });
    for (var k = 0; k < previews.length; k++) io.observe(previews[k].el);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      for (var i = 0; i < previews.length; i++) previews[i].resize();
    }, 120);
  });

  var last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = last === 0 ? 16 : Math.min(now - last, 64);
    last = now;
    for (var i = 0; i < previews.length; i++) {
      if (!previews[i].visible) continue;
      previews[i].tick(dt);
    }
  }
  requestAnimationFrame(loop);
})();
