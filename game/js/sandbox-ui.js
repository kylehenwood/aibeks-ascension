// Sandbox UI — floating toolbar + sidebar panel for the level editor

// ─── Floating toolbar (bottom-center) ──────────────────────────────────────────

// ─── Shared two-button pill factory ───────────────────────────────────────────
// Creates a hud-pill with two mode-btn buttons separated by a divider.
// buttons: [{ id, icon, label, extraClass, active }, ...]
// onSelect(index) is called when either button is clicked.
// Returns { el, setActive(index) }.
function createHudPill(id, buttons, onSelect, extraClass) {
  var el = document.createElement('div');
  el.id = id;
  el.className = 'hud-pill' + (extraClass ? ' ' + extraClass : '');

  var html = '';
  for (var i = 0; i < buttons.length; i++) {
    if (i > 0) html += '<div class="mode-btn__divider"></div>';
    var b = buttons[i];
    var cls = 'mode-btn' + (b.extraClass ? ' ' + b.extraClass : '') + (b.active ? ' mode-btn--active' : '');
    html +=
      '<button class="' + cls + '" id="' + b.id + '">' +
        '<span class="mode-btn__icon">' + b.icon + '</span>' +
        '<span class="mode-btn__label">' + b.label + '</span>' +
      '</button>';
  }
  el.innerHTML = html;

  (document.getElementById('sandbox-hud') || document.body).appendChild(el);

  var btns = buttons.map(function(b) { return el.querySelector('#' + b.id); });

  function setActive(index) {
    btns.forEach(function(btn, i) {
      btn.classList.toggle('mode-btn--active', i === index);
    });
  }

  btns.forEach(function(btn, i) {
    btn.addEventListener('click', function() { onSelect(i); });
  });

  return { el: el, setActive: setActive, btns: btns };
}


function createSandboxModeToggle() {
  var pill = createHudPill('sandbox-mode-toggle', [
    { id: 'mode-play',  icon: '▶', label: 'Play',  extraClass: 'mode-btn--play',  active: false },
    { id: 'mode-build', icon: '⚒', label: 'Build', extraClass: 'mode-btn--build', active: true  }
  ], function(i) {
    var mode = i === 0 ? 'play' : 'build';
    sandbox.mode = mode;

    sandbox.paused = false;
    if (mode === 'play') {
      sandbox.tool = '';
      sandbox.cameraFollow = true;
      if (typeof sandboxSyncCameraBtn === 'function') sandboxSyncCameraBtn();
    }
    sandboxSyncToolbarMode(mode);

    pill.setActive(i);
    sandboxSyncPauseBtn();
    sandboxAutoSave();
  }, 'hud-pill--padded');

  window.sandboxSyncModeToggle = function() {
    pill.setActive(sandbox.mode === 'build' ? 1 : 0);
  };
}


function createSandboxCameraToggle() {
  var pill = createHudPill('sandbox-camera-toggle', [
    { id: 'camera-follow-btn', icon: '⊙', label: 'Follow', extraClass: 'mode-btn--camera', active: true  },
    { id: 'camera-free-btn',   icon: '✥', label: 'Free',   extraClass: 'mode-btn--camera', active: false }
  ], function(i) {
    sandbox.cameraFollow = (i === 0);
    pill.setActive(i);
    sandboxAutoSave();
  }, 'hud-pill--padded');

  window.sandboxSyncCameraBtn = function() {
    pill.setActive(sandbox.cameraFollow ? 0 : 1);
  };
}


function createSandboxToolbar() {
  var toolbar = document.createElement('div');
  toolbar.id = 'sandbox-toolbar';
  toolbar.className = 'hud-pill hud-pill--padded';

  // Tool buttons
  var tools = [
    { id: 'star',     icon: '✦', label: 'Star',      key: 'S' },
    { id: 'immune',   icon: '✧', label: 'Immune',    key: 'I' },
    { id: 'shooting', icon: '↘', label: 'Shooting',  key: 'F' },
    { id: 'platform', icon: '▬', label: 'Platform',  key: 'D' },
    { id: 'cloud',    icon: '☁', label: 'Cloud',     key: 'C' },
    { id: 'erase',    icon: '✕', label: 'Erase',     key: 'E' }
  ];

  var toolsHTML = '';
  for (var i = 0; i < tools.length; i++) {
    var t = tools[i];
    var active = '';
    toolsHTML +=
      '<button class="toolbar-tool' + active + '" data-tool="' + t.id + '">' +
        '<span class="toolbar-tool__icon">' + t.icon + '</span>' +
        '<span class="toolbar-tool__label">' + t.label + '</span>' +
      '</button>';
  }

  toolbar.innerHTML =
    toolsHTML +
    '<div class="toolbar-divider"></div>' +
    '<button class="toolbar-tool" id="toolbar-undo">' +
      '<span class="toolbar-tool__icon">↩</span>' +
      '<span class="toolbar-tool__label">Undo</span>' +
    '</button>' +
    '<button class="toolbar-tool" id="toolbar-redo">' +
      '<span class="toolbar-tool__icon">↪</span>' +
      '<span class="toolbar-tool__label">Redo</span>' +
    '</button>';

  (document.getElementById('sandbox-hud') || document.body).appendChild(toolbar);

  // ── Tool switching ──
  var toolBtns = toolbar.querySelectorAll('.toolbar-tool');

  // ── Cloud contextual sub-toolbar ──
  var cloudPopover = document.createElement('div');
  cloudPopover.id = 'cloud-popover';
  cloudPopover.className = 'hud-pill hud-pill--padded';
  cloudPopover.style.display = 'none';
  cloudPopover.innerHTML =
    '<button class="toolbar-tool cloud-layer-pill cloud-layer-pill--active" data-layer="1">Back</button>' +
    '<button class="toolbar-tool cloud-layer-pill" data-layer="2">Mid</button>' +
    '<button class="toolbar-tool cloud-layer-pill" data-layer="3">Front</button>' +
    '<div class="toolbar-divider"></div>' +
    '<button class="toolbar-tool" id="cloud-popover-close">Close</button>';
  document.body.appendChild(cloudPopover);

  // Layer selection inside popover
  var layerPills = cloudPopover.querySelectorAll('.cloud-layer-pill');
  layerPills.forEach(function(btn) {
    btn.addEventListener('click', function() {
      sandbox.cloudLayer = parseInt(this.getAttribute('data-layer'));
      layerPills.forEach(function(b) { b.classList.remove('toolbar-tool--active'); });
      this.classList.add('toolbar-tool--active');
      // Sync sidebar
      var sidebarBtns = document.querySelectorAll('.cloud-layer-btn');
      sidebarBtns.forEach(function(b) {
        b.classList.toggle('cloud-layer-btn--active',
          parseInt(b.getAttribute('data-layer')) === sandbox.cloudLayer);
      });
    });
  });

  cloudPopover.querySelector('#cloud-popover-close').addEventListener('click', function() {
    setTool('');
    sandboxAutoSave();
  });

  function positionCloudPopover() {
    var cloudBtn = toolbar.querySelector('[data-tool="cloud"]');
    if (!cloudBtn) return;
    var rect = cloudBtn.getBoundingClientRect();
    var popRect = cloudPopover.getBoundingClientRect();
    cloudPopover.style.position = 'fixed';
    cloudPopover.style.bottom   = (window.innerHeight - rect.top + 8) + 'px';
    cloudPopover.style.left     = (rect.left + rect.width / 2 - popRect.width / 2) + 'px';
    cloudPopover.style.zIndex   = '10010';
  }

  function showCloudPopover() {
    cloudPopover.style.display = '';
    // Position after display so getBoundingClientRect is accurate
    requestAnimationFrame(positionCloudPopover);
  }

  function hideCloudPopover() {
    cloudPopover.style.display = 'none';
  }

  function setTool(t) {
    // Cloud tool toggles: clicking it again deselects
    if (t === 'cloud' && sandbox.tool === 'cloud') {
      t = '';
    }
    sandbox.tool = t;
    if (t && sandbox.mode !== 'build') {
      sandbox.mode = 'build';
      if (typeof sandboxSyncModeToggle === 'function') sandboxSyncModeToggle();
    }

    // Auto-enable bounds whenever a placement tool is selected
    var isPlacementTool = (t === 'star' || t === 'immune' || t === 'platform' || t === 'shooting' || t === 'cloud');
    if (isPlacementTool && !sandbox.showBounds) {
      sandbox.showBounds = true;
      var boundsBtn2 = document.getElementById('toolbar-bounds');
      if (boundsBtn2) boundsBtn2.classList.add('toolbar-toggle--active');
      var boundsCb2 = document.getElementById('sandbox-bounds');
      if (boundsCb2) boundsCb2.checked = true;
    }
    for (var i = 0; i < toolBtns.length; i++) {
      var btn = toolBtns[i];
      if (btn.getAttribute('data-tool') === t) {
        btn.classList.add('toolbar-tool--active');
      } else {
        btn.classList.remove('toolbar-tool--active');
      }
    }
    if (t === 'cloud') {
      showCloudPopover();
    } else {
      hideCloudPopover();
    }
  }

  for (var i = 0; i < toolBtns.length; i++) {
    toolBtns[i].addEventListener('click', function() {
      setTool(this.getAttribute('data-tool'));
      sandboxAutoSave();
    });
  }

  // ── Keyboard shortcuts — blocked in Play mode ──
  document.addEventListener('keydown', function(e) {
    if (gameState !== 'sandbox') return;
    if (sandbox.mode === 'play') return; // tools disabled in play mode
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    switch (e.key) {
      case 'z': case 'Z':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); sandboxUndo(); }
        break;
      case 'Escape':        setTool(''); sandboxAutoSave(); break;
      case 's': case 'S': if (!e.ctrlKey && !e.metaKey) { setTool('star');     sandboxAutoSave(); } break;
      case 'i': case 'I': if (!e.ctrlKey && !e.metaKey) { setTool('immune');   sandboxAutoSave(); } break;
      case 'i': case 'I': if (!e.ctrlKey && !e.metaKey) { setTool('immune');   sandboxAutoSave(); } break;
      case 'd': case 'D': if (!e.ctrlKey && !e.metaKey) { setTool('platform'); sandboxAutoSave(); } break;
      case 'f': case 'F': if (!e.ctrlKey && !e.metaKey) { setTool('shooting'); sandboxAutoSave(); } break;
      case 'c': case 'C': if (!e.ctrlKey && !e.metaKey) { setTool('cloud');    sandboxAutoSave(); } break;
      case 'e': case 'E': if (!e.ctrlKey && !e.metaKey) { setTool('erase');    sandboxAutoSave(); } break;
    }
  });

  // ── Actions ──
  toolbar.querySelector('#toolbar-undo').addEventListener('click', sandboxUndo);
  toolbar.querySelector('#toolbar-redo').addEventListener('click', sandboxRedo);

  toolbar._setTool = setTool;

  // ── Sync disabled state when mode changes ──
  window.sandboxSyncToolbarMode = function(mode) {
    var isPlay = (mode === 'play');
    toolbar.classList.toggle('toolbar--disabled', isPlay);
    for (var i = 0; i < toolBtns.length; i++) {
      toolBtns[i].disabled = isPlay;
      if (isPlay) toolBtns[i].classList.remove('toolbar-tool--active');
    }
  };
}


// ─── View toolbar (Bounds + Hit Areas) ────────────────────────────────────────

function createSandboxViewToolbar() {
  var bar = document.createElement('div');
  bar.id = 'sandbox-view-toolbar';
  bar.className = 'hud-pill hud-pill--padded';

  bar.innerHTML =
    '<button class="toolbar-tool" id="toolbar-bounds" title="Toggle bounding boxes (B)">' +
      '<span class="toolbar-tool__icon">⬚</span>' +
      '<span class="toolbar-tool__label">Bounds</span>' +
    '</button>' +
    '<button class="toolbar-tool" id="toolbar-click-areas" title="Toggle click areas (C)">' +
      '<span class="toolbar-tool__icon">⊡</span>' +
      '<span class="toolbar-tool__label">Hit Areas</span>' +
    '</button>';

  (document.getElementById('sandbox-hud') || document.body).appendChild(bar);

  var boundsBtn    = bar.querySelector('#toolbar-bounds');
  var clickAreasBtn = bar.querySelector('#toolbar-click-areas');

  if (sandbox.showBounds)     boundsBtn.classList.add('toolbar-tool--active');
  if (sandbox.showClickAreas) clickAreasBtn.classList.add('toolbar-tool--active');

  boundsBtn.addEventListener('click', function() {
    sandbox.showBounds = !sandbox.showBounds;
    boundsBtn.classList.toggle('toolbar-tool--active', sandbox.showBounds);
    var sidebarCheck = document.getElementById('sandbox-bounds');
    if (sidebarCheck) sidebarCheck.checked = sandbox.showBounds;
    sandboxAutoSave();
  });

  clickAreasBtn.addEventListener('click', function() {
    sandbox.showClickAreas = !sandbox.showClickAreas;
    clickAreasBtn.classList.toggle('toolbar-tool--active', sandbox.showClickAreas);
    var sidebarCheck = document.getElementById('sandbox-click-areas');
    if (sidebarCheck) sidebarCheck.checked = sandbox.showClickAreas;
    sandboxAutoSave();
  });

  // Keyboard shortcuts: B = bounds, C = click areas
  document.addEventListener('keydown', function(e) {
    if (gameState !== 'sandbox') return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'b' || e.key === 'B') boundsBtn.click();
    if (e.key === 'c' || e.key === 'C') clickAreasBtn.click();
  });
}


// ─── Sidebar panel (playback + stats + options + export) ───────────────────────

// Sync the pause button label/icon wherever it lives
// Sync all UI to current sandbox state (called after settings are loaded)
function sandboxSyncAllUI() {
  // Mode toggle (Play/Build) + toolbar disabled state
  if (typeof sandboxSyncModeToggle === 'function') sandboxSyncModeToggle();
  if (typeof sandboxSyncToolbarMode === 'function') sandboxSyncToolbarMode(sandbox.mode);
  // Camera toggle
  if (typeof sandboxSyncCameraBtn === 'function') sandboxSyncCameraBtn();
  // Pause button
  sandboxSyncPauseBtn();
  // Active tool button
  var toolBtns = document.querySelectorAll('.toolbar-tool');
  for (var i = 0; i < toolBtns.length; i++) {
    toolBtns[i].classList.toggle('toolbar-tool--active',
      toolBtns[i].getAttribute('data-tool') === sandbox.tool);
  }
  // Sidebar checkboxes
  var snapCb   = document.getElementById('sandbox-snap');
  var gravCb   = document.getElementById('sandbox-gravity');
  var boundsCb = document.getElementById('sandbox-bounds');
  var caCb     = document.getElementById('sandbox-click-areas');
  if (snapCb)   snapCb.checked   = sandbox.snapToGrid;
  if (gravCb)   gravCb.checked   = (typeof debugGravityEnabled !== 'undefined') ? debugGravityEnabled : true;
  if (boundsCb) boundsCb.checked = sandbox.showBounds;
  if (caCb)     caCb.checked     = sandbox.showClickAreas;
  var bgStarsCb = document.getElementById('sandbox-bg-shooting-stars');
  if (bgStarsCb) bgStarsCb.checked = (typeof bgShootingStarsEnabled !== 'undefined') ? bgShootingStarsEnabled : true;
  var immunityCb = document.getElementById('sandbox-star-immunity');
  if (immunityCb) immunityCb.checked = (typeof debugImmunityEnabled !== 'undefined') ? debugImmunityEnabled : false;
  // Toolbar toggle buttons
  var boundsBtn = document.getElementById('toolbar-bounds');
  var caBtn     = document.getElementById('toolbar-click-areas');
  if (boundsBtn) boundsBtn.classList.toggle('toolbar-tool--active', sandbox.showBounds);
  if (caBtn)     caBtn.classList.toggle('toolbar-tool--active', sandbox.showClickAreas);
}

function sandboxSyncPauseBtn() {
  var btn = document.getElementById('sidebar-pause');
  if (btn) {
    btn.querySelector('.sandbox-pause-icon').textContent  = sandbox.paused ? '▶' : '⏸';
    btn.querySelector('.sandbox-pause-label').textContent = sandbox.paused ? 'Play' : 'Pause';
  }
  if (typeof sandboxSyncModeToggle === 'function') sandboxSyncModeToggle();
}

function createSandboxPanel() {
  var panel = document.createElement('div');
  panel.id = 'sandbox-panel';
  panel.className = 'sandbox-panel';

  panel.innerHTML =
    '<div class="sandbox-panel__header">Level Editor</div>' +
    '<div class="sandbox-panel__body">' +

      // -- Playback
      '<div class="sandbox-panel__label">Playback</div>' +
      '<div class="sandbox-panel__row">' +
        '<button id="sidebar-pause" class="debug-panel__btn">' +
          '<span class="sandbox-pause-icon">⏸</span> ' +
          '<span class="sandbox-pause-label">Pause</span>' +
        '</button>' +
        '<button id="sidebar-step" class="debug-panel__btn">Step ▶▶</button>' +
      '</div>' +

      '<div class="sandbox-panel__divider"></div>' +

      // -- Options
      '<div class="sandbox-panel__label">Options</div>' +
      '<label class="debug-panel__toggle">' +
        '<input type="checkbox" id="sandbox-snap" checked>' +
        '<span>Snap to grid</span>' +
      '</label>' +
      '<label class="debug-panel__toggle">' +
        '<input type="checkbox" id="sandbox-gravity" checked>' +
        '<span>Gravity</span>' +
      '</label>' +
      '<label class="debug-panel__toggle">' +
        '<input type="checkbox" id="sandbox-debug-mode">' +
        '<span>Debug mode</span>' +
      '</label>' +
      '<label class="debug-panel__toggle">' +
        '<input type="checkbox" id="sandbox-bounds" checked>' +
        '<span>Show bounding boxes</span>' +
      '</label>' +
      '<label class="debug-panel__toggle">' +
        '<input type="checkbox" id="sandbox-click-areas">' +
        '<span>Show click areas</span>' +
      '</label>' +
      '<label class="debug-panel__toggle">' +
        '<input type="checkbox" id="sandbox-camera-border">' +
        '<span>Camera border</span>' +
      '</label>' +
      '<label class="debug-panel__toggle">' +
        '<input type="checkbox" id="sandbox-bg-shooting-stars" checked>' +
        '<span>Background shooting stars</span>' +
      '</label>' +
      '<label class="debug-panel__toggle">' +
        '<input type="checkbox" id="sandbox-star-immunity">' +
        '<span>Star immunity</span>' +
      '</label>' +

      '<div class="sandbox-panel__divider"></div>' +

      // -- Cloud painter
      '<div class="sandbox-panel__label">Cloud Brush</div>' +
      '<div class="sandbox-panel__stat"><span>Layer</span></div>' +
      '<div class="sandbox-panel__row" style="margin-top:4px">' +
        '<button class="debug-panel__btn cloud-layer-btn cloud-layer-btn--active" data-layer="1">Back</button>' +
        '<button class="debug-panel__btn cloud-layer-btn" data-layer="2">Mid</button>' +
        '<button class="debug-panel__btn cloud-layer-btn" data-layer="3">Front</button>' +
      '</div>' +
      '<div class="sandbox-panel__row" style="margin-top:8px">' +
        '<button class="debug-panel__btn cloud-brush-btn cloud-brush-btn--active" data-size="32">32px</button>' +
        '<button class="debug-panel__btn cloud-brush-btn" data-size="64">64px</button>' +
      '</div>' +

      '<div class="sandbox-panel__divider"></div>' +

      // -- Level stats
      '<div class="sandbox-panel__label">Level</div>' +
      '<div class="sandbox-panel__stat"><span>Stars</span><span id="sandbox-hook-count">0</span></div>' +
      '<div class="sandbox-panel__stat"><span>Shooting</span><span id="sandbox-shooting-count">0</span></div>' +
      '<div class="sandbox-panel__stat"><span>Platforms</span><span id="sandbox-platform-count">0</span></div>' +
      '<div class="sandbox-panel__stat"><span>Character</span><span id="sandbox-char-pos">0, 0</span></div>' +

      '<div class="sandbox-panel__divider"></div>' +

      // -- Level data
      '<div class="sandbox-panel__label">Level Data</div>' +
      '<button id="sandbox-clear" class="debug-panel__btn" style="width:100%;margin-top:2px">Clear level</button>' +
      '<button id="sandbox-export" class="debug-panel__btn" style="width:100%;margin-top:4px">Export</button>' +
      '<button id="sandbox-import" class="debug-panel__btn" style="width:100%;margin-top:4px">Import</button>' +
      '<textarea id="sandbox-level-data" class="debug-panel__input" style="width:100%;height:60px;margin-top:6px;resize:vertical;display:none" placeholder="Paste level JSON here..."></textarea>' +

      // -- Info
      '<div class="sandbox-panel__info">' +
        'S Star &nbsp; D Platform &nbsp; F Shooting &nbsp; E Erase<br>' +
        'R Respawn &nbsp; Right-click to erase' +
      '</div>' +
    '</div>';

  document.body.appendChild(panel);

  // ── Playback ──
  var pauseBtn = panel.querySelector('#sidebar-pause');
  var stepBtn  = panel.querySelector('#sidebar-step');

  pauseBtn.addEventListener('click', function() {
    sandbox.paused = !sandbox.paused;
    sandboxSyncPauseBtn();
    sandboxAutoSave();
  });

  stepBtn.addEventListener('click', function() {
    if (sandbox.paused) sandbox.frameStepQueued++;
  });

  // ── Options ──
  panel.querySelector('#sandbox-snap').addEventListener('change', function() {
    sandbox.snapToGrid = this.checked;
    sandboxAutoSave();
  });

  panel.querySelector('#sandbox-gravity').addEventListener('change', function() {
    debugGravityEnabled = this.checked;
    sandboxAutoSave();
  });

  panel.querySelector('#sandbox-debug-mode').addEventListener('change', function() {
    sandbox.debugMode = this.checked;
    sandboxAutoSave();
  });

  panel.querySelector('#sandbox-bounds').addEventListener('change', function() {
    sandbox.showBounds = this.checked;
    var btn = document.getElementById('toolbar-bounds');
    if (btn) btn.classList.toggle('toolbar-tool--active', this.checked);
    sandboxAutoSave();
  });

  panel.querySelector('#sandbox-click-areas').addEventListener('change', function() {
    sandbox.showClickAreas = this.checked;
    sandboxAutoSave();
  });

  panel.querySelector('#sandbox-camera-border').addEventListener('change', function() {
    sandbox.showCameraBorder = this.checked;
  });

  panel.querySelector('#sandbox-bg-shooting-stars').addEventListener('change', function() {
    if (typeof bgShootingStarsEnabled !== 'undefined') {
      bgShootingStarsEnabled = this.checked;
    }
    try { localStorage.setItem('ss_bgShootingStars', this.checked ? 'true' : 'false'); } catch(e) {}
  });

  panel.querySelector('#sandbox-star-immunity').addEventListener('change', function() {
    if (typeof debugImmunityEnabled !== 'undefined') {
      debugImmunityEnabled = this.checked;
    }
  });

  // ── Cloud painter controls ──
  var cloudLayerBtns = panel.querySelectorAll('.cloud-layer-btn');
  cloudLayerBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      sandbox.cloudLayer = parseInt(this.getAttribute('data-layer'));
      cloudLayerBtns.forEach(function(b) { b.classList.remove('cloud-layer-btn--active'); });
      this.classList.add('cloud-layer-btn--active');
    });
  });

  sandbox.cloudBrushSize = 32;
  var brushBtns = panel.querySelectorAll('.cloud-brush-btn');
  brushBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      sandbox.cloudBrushSize = parseInt(this.getAttribute('data-size'));
      brushBtns.forEach(function(b) { b.classList.remove('cloud-brush-btn--active'); });
      this.classList.add('cloud-brush-btn--active');
    });
  });

  // ── Clear (two-click confirmation) ──
  var clearBtn    = panel.querySelector('#sandbox-clear');
  var clearArmed  = false;
  var clearTimer  = null;

  function disarmClear() {
    clearArmed = false;
    clearTimeout(clearTimer);
    clearBtn.textContent = 'Clear level';
    clearBtn.style.color = '';
    clearBtn.style.borderColor = '';
  }

  clearBtn.addEventListener('click', function() {
    if (!clearArmed) {
      clearArmed = true;
      clearBtn.textContent = 'Sure? Click again to confirm';
      clearBtn.style.color = 'rgba(255,100,80,1)';
      clearBtn.style.borderColor = 'rgba(255,100,80,0.5)';
      clearTimer = setTimeout(disarmClear, 3000);
    } else {
      disarmClear();
      sandboxReset();
      sandbox.paused = false;
      if (typeof sandboxSyncPauseBtn === 'function') sandboxSyncPauseBtn();
      sandboxAutoSave();
    }
  });

  document.addEventListener('click', function(e) {
    if (clearArmed && !clearBtn.contains(e.target)) disarmClear();
  });

  // ── Export / Import ──
  panel.querySelector('#sandbox-export').addEventListener('click', function() {
    var data = sandboxExportLevel();
    var textarea = panel.querySelector('#sandbox-level-data');
    textarea.style.display = '';
    textarea.value = JSON.stringify(data, null, 2);
    textarea.select();
  });

  panel.querySelector('#sandbox-import').addEventListener('click', function() {
    var textarea = panel.querySelector('#sandbox-level-data');
    textarea.style.display = '';
    if (textarea.value.trim()) {
      try {
        var data = JSON.parse(textarea.value);
        sandboxImportLevel(data);
      } catch (e) {
        textarea.value = 'Error: Invalid JSON';
      }
    }
  });

  // ── Right-click erase ──
  var canvasEl = document.getElementById('js-starswinger');
  if (canvasEl) {
    canvasEl.addEventListener('contextmenu', function(e) {
      if (gameState !== 'sandbox') return;
      e.preventDefault();
      var pos = screenToCamera(e.clientX, e.clientY);
      var mouseX = pos.x;
      var mouseY = pos.y;
      var gpx = camera.x * parallax.gamePanel;
      var gpy = camera.y * parallax.gamePanel;
      var worldX = mouseX - gpx;
      var worldY = mouseY - gpy;
      var col = Math.round((worldX - gridBaseX) / gridSize.square);
      var row = Math.round(worldY / gridSize.square);

      var hitSS = sandboxFindShootingStarAt(worldX, worldY);
      if (hitSS) { removeShootingStar(hitSS); sandboxRebuildElements(); drawClicky(); return; }

      var hookIdx = sandboxFindHookAt(mouseX, mouseY);
      if (hookIdx >= 0) {
        var matchedHook = starHooks[hookIdx];
        var ownerSS = null;
        if (typeof shootingStarHooks !== 'undefined') {
          for (var si = 0; si < shootingStarHooks.length; si++) {
            if (shootingStarHooks[si].hook === matchedHook) { ownerSS = shootingStarHooks[si]; break; }
          }
        }
        if (ownerSS) { removeShootingStar(ownerSS); }
        else { starHooks.splice(hookIdx, 1); }
        sandboxRebuildElements(); drawClicky(); return;
      }
      sandboxRemovePlatformAt(col, row);
    });
  }

  // ── Live stats ──
  sandbox._updateStats = function() {
    var countEl = document.getElementById('sandbox-hook-count');
    var shootEl = document.getElementById('sandbox-shooting-count');
    var platEl  = document.getElementById('sandbox-platform-count');
    var posEl   = document.getElementById('sandbox-char-pos');
    if (countEl) countEl.textContent = starHooks.length;
    if (shootEl) shootEl.textContent = typeof shootingStarHooks !== 'undefined' ? shootingStarHooks.length : 0;
    if (platEl)  platEl.textContent  = sandbox.platforms.length;
    if (posEl)   posEl.textContent   = Math.round(character.centerX) + ', ' + Math.round(character.centerY);
  };
}
