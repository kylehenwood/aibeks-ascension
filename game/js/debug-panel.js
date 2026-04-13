// Debug Control Panel
// Fixed left sidebar for tweaking game settings in real-time

var debugPanel = {
  el: null
};

function createDebugPanel() {
  var panel = document.createElement('div');
  panel.id = 'debug-panel';
  // Helper to build a slider with info tooltip
  function sliderHTML(label, id, min, max, step, tip) {
    return '<div class="debug-panel__slider">' +
      '<div class="debug-panel__slider-label">' +
        '<span>' + label + '<span class="debug-panel__info" data-tip="' + tip + '">i</span></span>' +
        '<span id="' + id + '-val"></span>' +
      '</div>' +
      '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '">' +
    '</div>';
  }

  // Helper to build a toggle with info tooltip
  function toggleHTML(label, id, checked, tip) {
    return '<label class="debug-panel__toggle">' +
      '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '>' +
      '<span>' + label + '<span class="debug-panel__info" data-tip="' + tip + '">i</span></span>' +
    '</label>';
  }

  // Helper to wrap section content in a collapsible container
  function sectionHTML(title, content, startCollapsed) {
    var cls = startCollapsed ? ' collapsed' : '';
    return '<div class="debug-panel__section' + cls + '" data-section>' + title + '</div>' +
      '<div class="debug-panel__section-content' + cls + '" data-section-content>' + content + '</div>';
  }

  panel.innerHTML =
    '<div class="debug-panel__header">Control Panel</div>' +
    '<div class="debug-panel__body">' +

      // Game controls
      sectionHTML('Game',
        '<div class="debug-panel__actions">' +
          '<button id="debug-restart" class="debug-panel__btn">Restart</button>' +
          '<button id="debug-pause" class="debug-panel__btn">Pause</button>' +
        '</div>' +
        '<div class="debug-panel__actions">' +
          '<button id="debug-goto-menu" class="debug-panel__btn">Menu</button>' +
          '<button id="debug-goto-play" class="debug-panel__btn">Play</button>' +
          '<button id="debug-animate-start" class="debug-panel__btn">Animate Start</button>' +
        '</div>' +
        '<div class="debug-panel__state">' +
          'State: <span id="debug-state-display">--</span>' +
        '</div>' +
        sliderHTML('Restart Duration', 'debug-restart-duration', 60, 600, 10, 'Duration of restart pan in frames (60fps)')
      ) +

      // Toggles
      sectionHTML('Toggles',
        toggleHTML('Star Decay', 'debug-star-decay', true, 'Stars lose power over time while connected') +
        toggleHTML('Gravity', 'debug-gravity-enabled', true, 'Enable gravity during freefall and swing') +
        toggleHTML('Show Trajectory', 'debug-show-trajectory', false, 'Visualize rope points and velocity vector') +
        toggleHTML('Immunity Power-up', 'debug-star-immunity', true, 'Allow collecting immunity from safe stars') +
        toggleHTML('Stars Can Die', 'debug-star-death', true, 'Stars become unsafe after their power drains') +
        toggleHTML('Grapple Assist', 'debug-grapple-assist', false, 'Show optimal release angles for maximum forward momentum') +
        toggleHTML('Character Debug', 'debug-character-debug', false, 'Show character position, camera, velocity and state overlay')
      ) +

      // Physics sliders
      sectionHTML('Physics',
        sliderHTML('Gravity', 'debug-gravity', '0.1', '1.0', '0.01', 'Downward acceleration strength') +
        sliderHTML('Terminal Velocity', 'debug-terminal', '4', '24', '0.5', 'Maximum freefall speed') +
        sliderHTML('Rope Damping', 'debug-damping', '0.98', '1.0', '0.001', 'Energy retention per frame. 1.0 = no loss, lower = more drag') +
        sliderHTML('Rope Segments', 'debug-segments', '3', '12', '1', 'Number of points in the Verlet rope chain. More = bendier') +
        sliderHTML('Elasticity', 'debug-elasticity', '0', '1', '0.05', 'Rope stiffness. 0 = very stretchy, 1 = rigid. Stretches more at high momentum') +
        sliderHTML('Rigidity', 'debug-rigidity', '0', '1', '0.01', 'Straightens the beam. 0 = fully flexible rope, 1 = perfectly straight moonbeam') +
        sliderHTML('Sparkle Rate', 'debug-sparkle-rate', '0', '1', '0.05', 'Chance per rope point per frame to emit a sparkle. 0 = off') +
        sliderHTML('Sparkle Life', 'debug-sparkle-life', '10', '120', '5', 'How many frames each sparkle lasts before fading out')
      ) +

      // Visual
      sectionHTML('Visual',
        sliderHTML('Galaxy Blur', 'debug-galaxy-blur', '0', '120', '1', 'Blur radius applied to background galaxy blobs. 0 = sharp circles') +
        toggleHTML('Galaxy Border', 'debug-galaxy-border', false, 'Show tile borders on the galaxy layer for debugging overlap') +
        toggleHTML('FG Galaxy In Clouds', 'debug-fg-galaxy-in-clouds', false, 'ON = galaxy masked inside cloud shapes, OFF = galaxy rendered in front of clouds') +
        toggleHTML('FG Galaxy Use Border', 'debug-fg-galaxy-use-border', false, 'Mask with cloud borders instead of cloud fills (requires In Clouds)') +
        sliderHTML('FG Galaxy Blur', 'debug-fg-galaxy-blur', '0', '120', '1', 'Blur radius applied to foreground galaxy blobs. 0 = sharp circles') +
        sliderHTML('FG Galaxy Opacity', 'debug-fg-galaxy-opacity', '0', '1', '0.01', 'Opacity of the foreground galaxy blob fill')
      ) +

      // Stars - starts collapsed
      sectionHTML('Stars',
        sliderHTML('Decay Rate', 'debug-decay', '0.005', '0.08', '0.001', 'How fast stars lose power while connected') +
        sliderHTML('Immunity Threshold', 'debug-immunity', '50', '500', '10', 'Power needed from safe stars to gain immunity'),
        true
      ) +

      // Character
      sectionHTML('Character',
        sliderHTML('Grapple Delay (ms)', 'debug-grapple', '50', '600', '10', 'Time between clicking a star and the rope connecting') +
        sliderHTML('Grapple Ease', 'debug-grapple-ease', '1', '5', '0.1', 'Easing power for grapple animation. 1 = linear, higher = slow start then fast snap') +
        sliderHTML('Retract %', 'debug-retract', '0', '0.5', '0.01', 'How much the rope shortens on connect (0 = none, 0.5 = half)') +
        sliderHTML('Retract Speed', 'debug-retract-speed', '0.005', '0.15', '0.005', 'How fast the rope shortens after connecting. Higher = snappier') +
        sliderHTML('Ratchet', 'debug-ratchet', '0', '1', '0.05', 'How aggressively the rope shortens when character swings close to the star. 0 = off, 1 = instant') +
        sliderHTML('Ratchet Max %', 'debug-ratchet-max', '0', '1', '0.05', 'Max shortening as fraction of initial rope length. 0.5 = rope can halve at most') +
        sliderHTML('Rope Min Length', 'debug-min-rope', '0', '200', '5', 'Shortest the rope can get via ratchet/retract. 0 = no limit')
      ) +

      // Presets
      sectionHTML('Presets',
        '<div class="debug-panel__presets">' +
          '<div class="debug-panel__preset-row">' +
            '<select id="debug-preset-select" class="debug-panel__select">' +
              '<option value="">-- select preset --</option>' +
            '</select>' +
            '<button id="debug-preset-delete" class="debug-panel__btn debug-panel__btn--danger debug-panel__btn--icon" style="display:none" title="Delete preset">&times;</button>' +
          '</div>' +
          '<div class="debug-panel__actions">' +
            '<input type="text" id="debug-preset-name" class="debug-panel__input" placeholder="Preset name...">' +
            '<button id="debug-preset-save" class="debug-panel__btn">Save</button>' +
          '</div>' +
        '</div>' +
        '<div class="debug-panel__actions" style="margin-top:6px">' +
          '<button id="debug-copy" class="debug-panel__btn">Copy JS</button>' +
          '<button id="debug-reset" class="debug-panel__btn">Reset</button>' +
        '</div>' +
        '<div id="debug-toast" class="debug-panel__toast"></div>'
      ) +

    '</div>';

  document.body.insertBefore(panel, document.body.firstChild);
  debugPanel.el = panel;

  // Enable sidebar layout
  document.body.classList.add('layout--debug');

  // Wire up collapsible sections
  var sections = panel.querySelectorAll('[data-section]');
  for (var i = 0; i < sections.length; i++) {
    sections[i].addEventListener('click', function() {
      this.classList.toggle('collapsed');
      var content = this.nextElementSibling;
      if (content && content.hasAttribute('data-section-content')) {
        content.classList.toggle('collapsed');
      }
    });
  }

  // Wire up controls
  initDebugControls();

  // Live state display
  setInterval(function() {
    var stateEl = document.getElementById('debug-state-display');
    if (stateEl) stateEl.textContent = gameState || '--';
  }, 200);
}

// Default values to allow reset
var debugDefaults = {
  gravity: 0.4,
  terminalVelocity: 15,
  damping: 1,
  ropeSegments: 8,
  elasticity: 1,
  rigidity: 0.25,
  sparkleRate: 0.1,
  sparkleLife: 70,
  starDecayRate: 0.005,
  retractPercent: 0.1,
  retractSpeed: 0.15,
  ratchet: 0.7,
  ratchetMax: 1,
  ropeMinLength: 80,
  grappleDelay: 160,
  grappleEase: 2,
  immunityThreshold: 200,
  starDecayEnabled: true,
  gravityEnabled: true,
  showTrajectory: false,
  immunityEnabled: false,
  starsCanDie: true,
  grappleAssist: false,
  characterDebug: false,
  galaxyBlur: 0,
  galaxyBorder: false,
  fgGalaxyInClouds: false,
  fgGalaxyUseBorder: false,
  fgGalaxyBlur: 0,
  fgGalaxyOpacity: 1
};

var debugStarDecayRate = debugDefaults.starDecayRate;
var debugStarDecayEnabled = debugDefaults.starDecayEnabled;
var debugGravityEnabled = debugDefaults.gravityEnabled;
var debugImmunityEnabled = debugDefaults.immunityEnabled;
var debugStarsCanDie = debugDefaults.starsCanDie;
var debugGrappleAssist = debugDefaults.grappleAssist;
var debugCharacterDebug = debugDefaults.characterDebug;
var debugImmunityThreshold = debugDefaults.immunityThreshold;

var DEBUG_STORAGE_KEY = 'starswinger-debug-settings';

// Gather all current settings into a plain object
function getDebugSettings() {
  return {
    gravity: physics.GRAVITY,
    terminalVelocity: physics.TERMINAL_VELOCITY,
    damping: physics.DAMPING,
    ropeSegments: physics.ROPE_SEGMENTS,
    elasticity: physics.ELASTICITY,
    rigidity: physics.RIGIDITY,
    sparkleRate: physics.SPARKLE_RATE,
    sparkleLife: physics.SPARKLE_LIFE,
    starDecayRate: debugStarDecayRate,
    retractPercent: physics.RETRACT_PERCENT,
    retractSpeed: physics.RETRACT_SPEED,
    ratchet: physics.RATCHET,
    ratchetMax: physics.RATCHET_MAX,
    ropeMinLength: physics.ROPE_MIN_LENGTH,
    grappleDelay: character.grappelDelay,
    grappleEase: physics.GRAPPLE_EASE,
    immunityThreshold: debugImmunityThreshold,
    starDecayEnabled: debugStarDecayEnabled,
    gravityEnabled: debugGravityEnabled,
    showTrajectory: testingBool,
    immunityEnabled: debugImmunityEnabled,
    starsCanDie: debugStarsCanDie,
    grappleAssist: debugGrappleAssist,
    characterDebug: debugCharacterDebug,
    galaxyBlur: galaxyBlur,
    galaxyBorder: galaxyBorder,
    fgGalaxyInClouds: fgGalaxyInClouds,
    fgGalaxyUseBorder: fgGalaxyUseBorder,
    fgGalaxyBlur: fgGalaxyBlur,
    fgGalaxyOpacity: fgGalaxyOpacity
  };
}

// Apply a settings object to all game variables
function applyDebugSettings(s) {
  if (!s) return;
  if (s.gravity !== undefined) physics.GRAVITY = s.gravity;
  if (s.terminalVelocity !== undefined) physics.TERMINAL_VELOCITY = s.terminalVelocity;
  if (s.damping !== undefined) physics.DAMPING = s.damping;
  if (s.ropeSegments !== undefined) physics.ROPE_SEGMENTS = s.ropeSegments;
  if (s.elasticity !== undefined) physics.ELASTICITY = s.elasticity;
  if (s.rigidity !== undefined) physics.RIGIDITY = s.rigidity;
  if (s.sparkleRate !== undefined) physics.SPARKLE_RATE = s.sparkleRate;
  if (s.sparkleLife !== undefined) physics.SPARKLE_LIFE = s.sparkleLife;
  if (s.starDecayRate !== undefined) debugStarDecayRate = s.starDecayRate;
  if (s.retractPercent !== undefined) physics.RETRACT_PERCENT = s.retractPercent;
  if (s.retractSpeed !== undefined) physics.RETRACT_SPEED = s.retractSpeed;
  if (s.ratchet !== undefined) physics.RATCHET = s.ratchet;
  if (s.ratchetMax !== undefined) physics.RATCHET_MAX = s.ratchetMax;
  if (s.ropeMinLength !== undefined) physics.ROPE_MIN_LENGTH = s.ropeMinLength;
  if (s.grappleDelay !== undefined) character.grappelDelay = s.grappleDelay;
  if (s.grappleEase !== undefined) physics.GRAPPLE_EASE = s.grappleEase;
  if (s.immunityThreshold !== undefined) debugImmunityThreshold = s.immunityThreshold;
  if (s.starDecayEnabled !== undefined) debugStarDecayEnabled = s.starDecayEnabled;
  if (s.gravityEnabled !== undefined) debugGravityEnabled = s.gravityEnabled;
  if (s.showTrajectory !== undefined) testingBool = s.showTrajectory;
  if (s.immunityEnabled !== undefined) debugImmunityEnabled = s.immunityEnabled;
  if (s.starsCanDie !== undefined) debugStarsCanDie = s.starsCanDie;
  if (s.grappleAssist !== undefined) debugGrappleAssist = s.grappleAssist;
  if (s.characterDebug !== undefined) debugCharacterDebug = s.characterDebug;
  if (s.galaxyBlur !== undefined) { galaxyBlur = s.galaxyBlur; localStorage.setItem('ss_galaxyBlur', galaxyBlur); }
  if (s.galaxyBorder !== undefined) galaxyBorder = s.galaxyBorder;
  if (s.fgGalaxyInClouds !== undefined) fgGalaxyInClouds = s.fgGalaxyInClouds;
  if (s.fgGalaxyUseBorder !== undefined) fgGalaxyUseBorder = s.fgGalaxyUseBorder;
  if (s.fgGalaxyBlur !== undefined) { fgGalaxyBlur = s.fgGalaxyBlur; localStorage.setItem('ss_fgGalaxyBlur', fgGalaxyBlur); }
  if (s.fgGalaxyOpacity !== undefined) { fgGalaxyOpacity = s.fgGalaxyOpacity; localStorage.setItem('ss_fgGalaxyOpacity', fgGalaxyOpacity); }
}

// Save current settings to localStorage
function saveDebugSettings() {
  try {
    localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(getDebugSettings()));
  } catch(e) {}
}

// Load settings from localStorage and apply them
function loadDebugSettings() {
  try {
    var raw = localStorage.getItem(DEBUG_STORAGE_KEY);
    if (raw) {
      applyDebugSettings(JSON.parse(raw));
      return true;
    }
  } catch(e) {}
  return false;
}

// Generate a JS code snippet of the current settings
function settingsToClipboard() {
  var s = getDebugSettings();
  var lines = [
    '// Starswinger settings',
    'physics.GRAVITY = ' + s.gravity + ';',
    'physics.TERMINAL_VELOCITY = ' + s.terminalVelocity + ';',
    'physics.DAMPING = ' + s.damping + ';',
    'physics.ROPE_SEGMENTS = ' + s.ropeSegments + ';',
    'physics.ELASTICITY = ' + s.elasticity + ';',
    'physics.RIGIDITY = ' + s.rigidity + ';',
    'physics.SPARKLE_RATE = ' + s.sparkleRate + ';',
    'physics.SPARKLE_LIFE = ' + s.sparkleLife + ';',
    'physics.RETRACT_PERCENT = ' + s.retractPercent + ';',
    'physics.RETRACT_SPEED = ' + s.retractSpeed + ';',
    'physics.RATCHET = ' + s.ratchet + ';',
    'physics.RATCHET_MAX = ' + s.ratchetMax + ';',
    'physics.ROPE_MIN_LENGTH = ' + s.ropeMinLength + ';',
    'character.grappelDelay = ' + s.grappleDelay + ';',
    'physics.GRAPPLE_EASE = ' + s.grappleEase + ';',
    'debugStarDecayRate = ' + s.starDecayRate + ';',
    'debugImmunityThreshold = ' + s.immunityThreshold + ';',
    'debugStarDecayEnabled = ' + s.starDecayEnabled + ';',
    'debugGravityEnabled = ' + s.gravityEnabled + ';',
    'debugImmunityEnabled = ' + s.immunityEnabled + ';',
    'debugStarsCanDie = ' + s.starsCanDie + ';',
    'debugGrappleAssist = ' + s.grappleAssist + ';',
    'debugCharacterDebug = ' + s.characterDebug + ';',
    'testingBool = ' + s.showTrajectory + ';',
    'galaxyBlur = ' + s.galaxyBlur + ';',
    'galaxyBorder = ' + s.galaxyBorder + ';',
    'fgGalaxyInClouds = ' + s.fgGalaxyInClouds + ';',
    'fgGalaxyUseBorder = ' + s.fgGalaxyUseBorder + ';',
    'fgGalaxyBlur = ' + s.fgGalaxyBlur + ';',
    'fgGalaxyOpacity = ' + s.fgGalaxyOpacity + ';'
  ];
  return lines.join('\n');
}

// Show a brief toast message in the panel
function debugToast(msg) {
  var el = document.getElementById('debug-toast');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._timer);
  el._timer = setTimeout(function() {
    el.style.opacity = '0';
  }, 1500);
}

var DEBUG_PRESETS_KEY = 'starswinger-debug-presets';

function getPresets() {
  try {
    var raw = localStorage.getItem(DEBUG_PRESETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function savePresets(presets) {
  try {
    localStorage.setItem(DEBUG_PRESETS_KEY, JSON.stringify(presets));
  } catch(e) {}
}

function refreshPresetSelect() {
  var select = document.getElementById('debug-preset-select');
  if (!select) return;
  var presets = getPresets();
  var names = Object.keys(presets).sort();
  // Keep the placeholder, rebuild the rest
  select.innerHTML = '<option value="">-- select preset --</option>';
  for (var i = 0; i < names.length; i++) {
    var opt = document.createElement('option');
    opt.value = names[i];
    opt.textContent = names[i];
    select.appendChild(opt);
  }
}

function initDebugControls() {

  // Load saved settings from localStorage before wiring up UI
  loadDebugSettings();

  // --- Game action buttons ---
  document.getElementById('debug-restart').addEventListener('click', function() {
    if (gameState === 'playGame' || gameState === 'gameOver') {
      restartGame();
    }
  });

  document.getElementById('debug-pause').addEventListener('click', function() {
    if (gameState === 'playGame' || gameState === 'gamePaused') {
      gamePause();
    }
  });

  document.getElementById('debug-goto-menu').addEventListener('click', function() {
    if (gameState === 'gameMenu' || gameState === 'menuAnimation') return;
    detach();
    backToMenu();
  });

  document.getElementById('debug-goto-play').addEventListener('click', function() {
    if (gameState === 'playGame') return;
    detach();
    clearVariables();
    camera.x = 0;
    camera.y = 0;
    character.centerY = -32;
    character.centerX = camera.width/2;
    physics.vx = 0;
    physics.vy = 0;
    gameSetup();
    startGame();
  });

  document.getElementById('debug-animate-start').addEventListener('click', function() {
    detach();
    clearVariables();
    camera.x = 0;
    camera.y = 0;
    physics.vx = 0;
    physics.vy = 0;
    setupMenu();
    animateStart();
  });

  // --- Sliders ---
  var restartDurSlider = document.getElementById('debug-restart-duration');
  var restartDurVal = document.getElementById('debug-restart-duration-val');
  restartDurSlider.value = restartDuration;
  restartDurVal.textContent = restartDuration;
  restartDurSlider.addEventListener('input', function() {
    restartDuration = parseInt(this.value);
    restartDurVal.textContent = this.value;
  });

  var gravitySlider = document.getElementById('debug-gravity');
  var gravityVal = document.getElementById('debug-gravity-val');
  gravitySlider.value = physics.GRAVITY;
  gravityVal.textContent = physics.GRAVITY;
  gravitySlider.addEventListener('input', function() {
    physics.GRAVITY = parseFloat(this.value);
    gravityVal.textContent = this.value;
  });

  var terminalSlider = document.getElementById('debug-terminal');
  var terminalVal = document.getElementById('debug-terminal-val');
  terminalSlider.value = physics.TERMINAL_VELOCITY;
  terminalVal.textContent = physics.TERMINAL_VELOCITY;
  terminalSlider.addEventListener('input', function() {
    physics.TERMINAL_VELOCITY = parseFloat(this.value);
    terminalVal.textContent = this.value;
  });

  var dampingSlider = document.getElementById('debug-damping');
  var dampingVal = document.getElementById('debug-damping-val');
  dampingSlider.value = physics.DAMPING;
  dampingVal.textContent = physics.DAMPING;
  dampingSlider.addEventListener('input', function() {
    physics.DAMPING = parseFloat(this.value);
    dampingVal.textContent = this.value;
  });

  var segmentsSlider = document.getElementById('debug-segments');
  var segmentsVal = document.getElementById('debug-segments-val');
  segmentsSlider.value = physics.ROPE_SEGMENTS;
  segmentsVal.textContent = physics.ROPE_SEGMENTS;
  segmentsSlider.addEventListener('input', function() {
    physics.ROPE_SEGMENTS = parseInt(this.value);
    segmentsVal.textContent = this.value;
  });

  var elasticitySlider = document.getElementById('debug-elasticity');
  var elasticityVal = document.getElementById('debug-elasticity-val');
  elasticitySlider.value = physics.ELASTICITY;
  elasticityVal.textContent = physics.ELASTICITY;
  elasticitySlider.addEventListener('input', function() {
    physics.ELASTICITY = parseFloat(this.value);
    elasticityVal.textContent = this.value;
  });

  var rigiditySlider = document.getElementById('debug-rigidity');
  var rigidityVal = document.getElementById('debug-rigidity-val');
  rigiditySlider.value = physics.RIGIDITY;
  rigidityVal.textContent = physics.RIGIDITY;
  rigiditySlider.addEventListener('input', function() {
    physics.RIGIDITY = parseFloat(this.value);
    rigidityVal.textContent = this.value;
  });

  var sparkleRateSlider = document.getElementById('debug-sparkle-rate');
  var sparkleRateVal = document.getElementById('debug-sparkle-rate-val');
  sparkleRateSlider.value = physics.SPARKLE_RATE;
  sparkleRateVal.textContent = physics.SPARKLE_RATE;
  sparkleRateSlider.addEventListener('input', function() {
    physics.SPARKLE_RATE = parseFloat(this.value);
    sparkleRateVal.textContent = this.value;
  });

  var sparkleLifeSlider = document.getElementById('debug-sparkle-life');
  var sparkleLifeVal = document.getElementById('debug-sparkle-life-val');
  sparkleLifeSlider.value = physics.SPARKLE_LIFE;
  sparkleLifeVal.textContent = physics.SPARKLE_LIFE;
  sparkleLifeSlider.addEventListener('input', function() {
    physics.SPARKLE_LIFE = parseFloat(this.value);
    sparkleLifeVal.textContent = this.value;
  });

  var decaySlider = document.getElementById('debug-decay');
  var decayVal = document.getElementById('debug-decay-val');
  decaySlider.value = debugStarDecayRate;
  decayVal.textContent = debugStarDecayRate;
  decaySlider.addEventListener('input', function() {
    debugStarDecayRate = parseFloat(this.value);
    decayVal.textContent = this.value;
  });

  var grappleSlider = document.getElementById('debug-grapple');
  var grappleVal = document.getElementById('debug-grapple-val');
  grappleSlider.value = character.grappelDelay;
  grappleVal.textContent = character.grappelDelay;
  grappleSlider.addEventListener('input', function() {
    character.grappelDelay = parseFloat(this.value);
    grappleVal.textContent = this.value;
  });

  var grappleEaseSlider = document.getElementById('debug-grapple-ease');
  var grappleEaseVal = document.getElementById('debug-grapple-ease-val');
  grappleEaseSlider.value = physics.GRAPPLE_EASE;
  grappleEaseVal.textContent = physics.GRAPPLE_EASE;
  grappleEaseSlider.addEventListener('input', function() {
    physics.GRAPPLE_EASE = parseFloat(this.value);
    grappleEaseVal.textContent = this.value;
  });

  var retractSlider = document.getElementById('debug-retract');
  var retractVal = document.getElementById('debug-retract-val');
  retractSlider.value = physics.RETRACT_PERCENT;
  retractVal.textContent = physics.RETRACT_PERCENT;
  retractSlider.addEventListener('input', function() {
    physics.RETRACT_PERCENT = parseFloat(this.value);
    retractVal.textContent = this.value;
  });

  var retractSpeedSlider = document.getElementById('debug-retract-speed');
  var retractSpeedVal = document.getElementById('debug-retract-speed-val');
  retractSpeedSlider.value = physics.RETRACT_SPEED;
  retractSpeedVal.textContent = physics.RETRACT_SPEED;
  retractSpeedSlider.addEventListener('input', function() {
    physics.RETRACT_SPEED = parseFloat(this.value);
    retractSpeedVal.textContent = this.value;
  });

  var ratchetSlider = document.getElementById('debug-ratchet');
  var ratchetVal = document.getElementById('debug-ratchet-val');
  ratchetSlider.value = physics.RATCHET;
  ratchetVal.textContent = physics.RATCHET;
  ratchetSlider.addEventListener('input', function() {
    physics.RATCHET = parseFloat(this.value);
    ratchetVal.textContent = this.value;
  });

  var ratchetMaxSlider = document.getElementById('debug-ratchet-max');
  var ratchetMaxVal = document.getElementById('debug-ratchet-max-val');
  ratchetMaxSlider.value = physics.RATCHET_MAX;
  ratchetMaxVal.textContent = physics.RATCHET_MAX;
  ratchetMaxSlider.addEventListener('input', function() {
    physics.RATCHET_MAX = parseFloat(this.value);
    ratchetMaxVal.textContent = this.value;
  });

  var minRopeSlider = document.getElementById('debug-min-rope');
  var minRopeVal = document.getElementById('debug-min-rope-val');
  minRopeSlider.value = physics.ROPE_MIN_LENGTH;
  minRopeVal.textContent = physics.ROPE_MIN_LENGTH;
  minRopeSlider.addEventListener('input', function() {
    physics.ROPE_MIN_LENGTH = parseFloat(this.value);
    minRopeVal.textContent = this.value;
  });

  var immunitySlider = document.getElementById('debug-immunity');
  var immunityVal = document.getElementById('debug-immunity-val');
  immunitySlider.value = debugImmunityThreshold;
  immunityVal.textContent = debugImmunityThreshold;
  immunitySlider.addEventListener('input', function() {
    debugImmunityThreshold = parseFloat(this.value);
    immunityVal.textContent = this.value;
  });

  // --- Toggles ---
  var starDecayToggle = document.getElementById('debug-star-decay');
  starDecayToggle.checked = debugStarDecayEnabled;
  starDecayToggle.addEventListener('change', function() {
    debugStarDecayEnabled = this.checked;
  });

  var gravityToggle = document.getElementById('debug-gravity-enabled');
  gravityToggle.checked = debugGravityEnabled;
  gravityToggle.addEventListener('change', function() {
    debugGravityEnabled = this.checked;
  });

  var trajectoryToggle = document.getElementById('debug-show-trajectory');
  trajectoryToggle.checked = testingBool;
  trajectoryToggle.addEventListener('change', function() {
    testingBool = this.checked;
  });

  var immunityToggle = document.getElementById('debug-star-immunity');
  immunityToggle.checked = debugImmunityEnabled;
  immunityToggle.addEventListener('change', function() {
    debugImmunityEnabled = this.checked;
  });

  var starsCanDieToggle = document.getElementById('debug-star-death');
  starsCanDieToggle.checked = debugStarsCanDie;
  starsCanDieToggle.addEventListener('change', function() {
    debugStarsCanDie = this.checked;
  });

  var grappleAssistToggle = document.getElementById('debug-grapple-assist');
  grappleAssistToggle.checked = debugGrappleAssist;
  grappleAssistToggle.addEventListener('change', function() {
    debugGrappleAssist = this.checked;
  });

  var characterDebugToggle = document.getElementById('debug-character-debug');
  characterDebugToggle.checked = debugCharacterDebug;
  characterDebugToggle.addEventListener('change', function() {
    debugCharacterDebug = this.checked;
  });

  // --- Visual controls ---
  var galaxyBlurSlider = document.getElementById('debug-galaxy-blur');
  var galaxyBlurVal = document.getElementById('debug-galaxy-blur-val');
  galaxyBlurSlider.value = galaxyBlur;
  galaxyBlurVal.textContent = galaxyBlur;
  galaxyBlurSlider.addEventListener('input', function() {
    galaxyBlur = parseFloat(this.value);
    galaxyBlurVal.textContent = this.value;
    localStorage.setItem('ss_galaxyBlur', galaxyBlur);
    createGalaxyLayer();
  });

  var galaxyBorderToggle = document.getElementById('debug-galaxy-border');
  galaxyBorderToggle.checked = galaxyBorder;
  galaxyBorderToggle.addEventListener('change', function() {
    galaxyBorder = this.checked;
  });

  var fgGalaxyInCloudsToggle = document.getElementById('debug-fg-galaxy-in-clouds');
  fgGalaxyInCloudsToggle.checked = fgGalaxyInClouds;
  fgGalaxyInCloudsToggle.addEventListener('change', function() {
    fgGalaxyInClouds = this.checked;
  });

  var fgGalaxyUseBorderToggle = document.getElementById('debug-fg-galaxy-use-border');
  fgGalaxyUseBorderToggle.checked = fgGalaxyUseBorder;
  fgGalaxyUseBorderToggle.addEventListener('change', function() {
    fgGalaxyUseBorder = this.checked;
  });

  var fgGalaxyBlurSlider = document.getElementById('debug-fg-galaxy-blur');
  var fgGalaxyBlurVal = document.getElementById('debug-fg-galaxy-blur-val');
  fgGalaxyBlurSlider.value = fgGalaxyBlur;
  fgGalaxyBlurVal.textContent = fgGalaxyBlur;
  fgGalaxyBlurSlider.addEventListener('input', function() {
    fgGalaxyBlur = parseFloat(this.value);
    fgGalaxyBlurVal.textContent = this.value;
    localStorage.setItem('ss_fgGalaxyBlur', fgGalaxyBlur);
    createForegroundGalaxy();
  });

  var fgGalaxyOpacitySlider = document.getElementById('debug-fg-galaxy-opacity');
  var fgGalaxyOpacityVal = document.getElementById('debug-fg-galaxy-opacity-val');
  fgGalaxyOpacitySlider.value = fgGalaxyOpacity;
  fgGalaxyOpacityVal.textContent = fgGalaxyOpacity;
  fgGalaxyOpacitySlider.addEventListener('input', function() {
    fgGalaxyOpacity = parseFloat(this.value);
    fgGalaxyOpacityVal.textContent = this.value;
    localStorage.setItem('ss_fgGalaxyOpacity', fgGalaxyOpacity);
    createForegroundGalaxy();
  });

  // --- Sync all UI elements to current variable values ---
  function syncUI() {
    gravitySlider.value = physics.GRAVITY;
    gravityVal.textContent = physics.GRAVITY;
    terminalSlider.value = physics.TERMINAL_VELOCITY;
    terminalVal.textContent = physics.TERMINAL_VELOCITY;
    dampingSlider.value = physics.DAMPING;
    dampingVal.textContent = physics.DAMPING;
    segmentsSlider.value = physics.ROPE_SEGMENTS;
    segmentsVal.textContent = physics.ROPE_SEGMENTS;
    elasticitySlider.value = physics.ELASTICITY;
    elasticityVal.textContent = physics.ELASTICITY;
    rigiditySlider.value = physics.RIGIDITY;
    rigidityVal.textContent = physics.RIGIDITY;
    sparkleRateSlider.value = physics.SPARKLE_RATE;
    sparkleRateVal.textContent = physics.SPARKLE_RATE;
    sparkleLifeSlider.value = physics.SPARKLE_LIFE;
    sparkleLifeVal.textContent = physics.SPARKLE_LIFE;
    decaySlider.value = debugStarDecayRate;
    decayVal.textContent = debugStarDecayRate;
    grappleSlider.value = character.grappelDelay;
    grappleVal.textContent = character.grappelDelay;
    grappleEaseSlider.value = physics.GRAPPLE_EASE;
    grappleEaseVal.textContent = physics.GRAPPLE_EASE;
    retractSlider.value = physics.RETRACT_PERCENT;
    retractVal.textContent = physics.RETRACT_PERCENT;
    retractSpeedSlider.value = physics.RETRACT_SPEED;
    retractSpeedVal.textContent = physics.RETRACT_SPEED;
    ratchetSlider.value = physics.RATCHET;
    ratchetVal.textContent = physics.RATCHET;
    ratchetMaxSlider.value = physics.RATCHET_MAX;
    ratchetMaxVal.textContent = physics.RATCHET_MAX;
    minRopeSlider.value = physics.ROPE_MIN_LENGTH;
    minRopeVal.textContent = physics.ROPE_MIN_LENGTH;
    immunitySlider.value = debugImmunityThreshold;
    immunityVal.textContent = debugImmunityThreshold;
    starDecayToggle.checked = debugStarDecayEnabled;
    gravityToggle.checked = debugGravityEnabled;
    trajectoryToggle.checked = testingBool;
    immunityToggle.checked = debugImmunityEnabled;
    starsCanDieToggle.checked = debugStarsCanDie;
    grappleAssistToggle.checked = debugGrappleAssist;
    galaxyBlurSlider.value = galaxyBlur;
    galaxyBlurVal.textContent = galaxyBlur;
    galaxyBorderToggle.checked = galaxyBorder;
    fgGalaxyInCloudsToggle.checked = fgGalaxyInClouds;
    fgGalaxyUseBorderToggle.checked = fgGalaxyUseBorder;
    fgGalaxyBlurSlider.value = fgGalaxyBlur;
    fgGalaxyBlurVal.textContent = fgGalaxyBlur;
    fgGalaxyOpacitySlider.value = fgGalaxyOpacity;
    fgGalaxyOpacityVal.textContent = fgGalaxyOpacity;
  }

  // Sync UI to loaded settings (from localStorage)
  syncUI();

  // --- Auto-save: persist to localStorage on any slider/toggle change ---
  var panelBody = debugPanel.el.querySelector('.debug-panel__body');
  panelBody.addEventListener('input', function() { saveDebugSettings(); });
  panelBody.addEventListener('change', function() { saveDebugSettings(); });

  // --- Presets ---
  refreshPresetSelect();

  var presetSelect = document.getElementById('debug-preset-select');
  var presetDeleteBtn = document.getElementById('debug-preset-delete');

  // Auto-load on selection & show/hide delete button
  presetSelect.addEventListener('change', function() {
    var name = this.value;
    presetDeleteBtn.style.display = name ? '' : 'none';
    if (!name) return;
    var presets = getPresets();
    if (!presets[name]) { debugToast('Preset not found'); return; }
    applyDebugSettings(presets[name]);
    syncUI();
    saveDebugSettings();
    debugToast('Loaded "' + name + '"');
  });

  document.getElementById('debug-preset-save').addEventListener('click', function() {
    var nameInput = document.getElementById('debug-preset-name');
    var name = nameInput.value.trim();
    if (!name) { debugToast('Enter a preset name'); return; }
    var presets = getPresets();
    presets[name] = getDebugSettings();
    savePresets(presets);
    refreshPresetSelect();
    presetSelect.value = name;
    presetDeleteBtn.style.display = '';
    nameInput.value = '';
    debugToast('Saved "' + name + '"');
  });

  presetDeleteBtn.addEventListener('click', function() {
    var name = presetSelect.value;
    if (!name) return;
    var presets = getPresets();
    delete presets[name];
    savePresets(presets);
    refreshPresetSelect();
    presetDeleteBtn.style.display = 'none';
    debugToast('Deleted "' + name + '"');
  });

  // --- Copy JS to clipboard ---
  document.getElementById('debug-copy').addEventListener('click', function() {
    var text = settingsToClipboard();
    navigator.clipboard.writeText(text).then(function() {
      debugToast('Copied to clipboard');
    }, function() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      debugToast('Copied to clipboard');
    });
  });

  // --- Reset to defaults ---
  document.getElementById('debug-reset').addEventListener('click', function() {
    applyDebugSettings(debugDefaults);
    syncUI();
    saveDebugSettings();
    debugToast('Reset to defaults');
  });
}
