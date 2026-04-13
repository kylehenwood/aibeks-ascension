// Autoplay — AI-controlled grapple attach/detach
// Uses grapple assist best-angle data to time releases,
// then auto-attaches to the next visible star.

var autoplay = {
  enabled: false,
  accuracy: 90,          // 80-100, how close to optimal release angle (%)
  waiting: false,        // true while falling and looking for next star
  detachAngle: null,     // the randomised target angle for this swing
  hasDetached: false     // prevent re-detach on same swing
};


// Create the floating autoplay panel (top-right)
function createAutoplayPanel() {
  var panel = document.createElement('div');
  panel.id = 'autoplay-panel';

  panel.innerHTML =
    '<div class="debug-panel__header">Autoplay</div>' +
    '<div class="debug-panel__body">' +
      '<label class="debug-panel__toggle">' +
        '<input type="checkbox" id="autoplay-toggle">' +
        '<span>Enabled</span>' +
      '</label>' +
      '<div class="debug-panel__slider">' +
        '<div class="debug-panel__slider-label">' +
          '<span>Accuracy</span>' +
          '<span id="autoplay-accuracy-val">90%</span>' +
        '</div>' +
        '<input type="range" id="autoplay-accuracy" min="80" max="100" step="1" value="90">' +
      '</div>' +
    '</div>';

  document.body.appendChild(panel);

  // Wire controls
  var toggle = document.getElementById('autoplay-toggle');
  toggle.addEventListener('change', function() {
    autoplay.enabled = this.checked;
    autoplay.waiting = false;
    autoplay.detachAngle = null;
    autoplay.hasDetached = false;
    // Force grapple assist on when autoplay is active
    if (this.checked) debugGrappleAssist = true;
  });

  var slider = document.getElementById('autoplay-accuracy');
  var sliderVal = document.getElementById('autoplay-accuracy-val');
  slider.addEventListener('input', function() {
    autoplay.accuracy = parseInt(this.value);
    sliderVal.textContent = this.value + '%';
  });
}


// Called every frame from updateGame when autoplay is enabled.
// Handles both detach (while swinging) and attach (while falling).
function updateAutoplay() {
  if (!autoplay.enabled) return;
  if (gameState !== 'playGame') return;

  if (character.swinging) {
    autoplayDetach();
  } else {
    autoplayAttach();
  }
}


// While swinging: detach at (or near) the optimal release angle
function autoplayDetach() {
  if (!physics.ropeActive || !selectedHook) return;

  // Need grapple assist data — bestAngle stored by drawGrappleAssist
  var bestAngle = physics._assistBestAngle;
  if (bestAngle === null || bestAngle === undefined) return;

  var rope = physics.rope;
  var last = rope[rope.length - 1];
  var hook = rope[0];

  var curAngle = Math.atan2(last.y - hook.y, last.x - hook.x);

  // Pick a randomised target angle once per swing
  if (autoplay.detachAngle === null) {
    // Accuracy 100% = exactly at bestAngle, 80% = up to 20% of PI offset
    var maxOffset = (1 - autoplay.accuracy / 100) * Math.PI;
    var offset = (Math.random() * 2 - 1) * maxOffset;
    autoplay.detachAngle = bestAngle + offset;
    autoplay.hasDetached = false;
  }

  if (autoplay.hasDetached) return;

  // Only detach on forward swings (vx > 0)
  if (physics.vx <= 0) return;

  // Check if character has reached (or passed) the target angle
  var angleDiff = curAngle - autoplay.detachAngle;
  if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  // Use angular velocity direction to determine "passed"
  var omega = curAngle - Math.atan2(last.oy - hook.y, last.ox - hook.x);
  if (omega > Math.PI) omega -= 2 * Math.PI;
  if (omega < -Math.PI) omega += 2 * Math.PI;
  var swingDir = omega >= 0 ? 1 : -1;

  if (angleDiff * swingDir >= 0) {
    // Passed the target — release
    detach();
    autoplay.hasDetached = true;
    autoplay.detachAngle = null;
    autoplay.waiting = true;
  }
}


// While falling: find the next visible alive star and grapple to it
function autoplayAttach() {
  if (character.swinging) return;

  // Find the next alive star that is on-screen
  var best = null;
  var bestDist = Infinity;

  for (var i = 0; i < starHooks.length; i++) {
    var hook = starHooks[i];
    if (!hook.star.alive) continue;

    // Must be within camera viewport
    var screenX = hook.centerX + camera.x * parallax.gamePanel;
    if (screenX < -hook.size || screenX > camera.width + hook.size) continue;
    var screenY = hook.centerY;
    if (screenY < -hook.size || screenY > camera.height + hook.size) continue;

    // Prefer stars ahead of (or above) the character
    var dx = hook.centerX - character.centerX;
    var dy = hook.centerY - character.centerY;
    var dist = dx * dx + dy * dy;

    // Skip stars behind the character (unless nothing else)
    if (dx < -100) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = hook;
    }
  }

  // Fallback: try any visible alive star including ones slightly behind
  if (!best) {
    for (var i = 0; i < starHooks.length; i++) {
      var hook = starHooks[i];
      if (!hook.star.alive) continue;
      var screenX = hook.centerX + camera.x * parallax.gamePanel;
      if (screenX < -hook.size || screenX > camera.width + hook.size) continue;
      var screenY = hook.centerY;
      if (screenY < -hook.size || screenY > camera.height + hook.size) continue;
      var dx = hook.centerX - character.centerX;
      var dy = hook.centerY - character.centerY;
      var dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = hook;
      }
    }
  }

  if (best) {
    changeHook(best.star.index);
    autoplay.waiting = false;
    autoplay.detachAngle = null;
    autoplay.hasDetached = false;
  }
}
