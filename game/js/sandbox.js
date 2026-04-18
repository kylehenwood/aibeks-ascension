// Sandbox Mode — level editor for testing game mechanics
// Click to place stars or platforms, grapple to test, frame-step through physics

var sandbox = {
  active: false,
  paused: false,
  frameStepQueued: 0,
  hooks: [],           // indices of sandbox-placed hooks in starHooks[]
  platforms: [],        // {x, y, cols, rows, surface} — placed platform blocks
  placedItems: [],      // ordered history for undo: {type:'star',index} or {type:'platform',index}
  redoStack: [],        // stack of {level, items} snapshots for redo

  mode: 'build',        // 'build' | 'play'
  tool: '',             // '' | 'star' | 'immune' | 'platform' | 'shooting' | 'erase' | 'cloud'
  debugMode: false,     // show per-star bounds boxes and other debug overlays

  // Cloud painter
  clouds: [],           // [{x, y, w, h, opacity, layer}] — screen-space blobs
  cloudBrushSize: 32,   // px width
  cloudLayer: 1,        // 1=background, 2=small, 3=tiny
  cloudPainting: false,  // true while dragging with cloud tool
  erasePainting: false,  // true while dragging with erase tool
  cloudLastPaintX: null,
  cloudLastPaintY: null,
  hoverCloudIdx: -1,     // index of cloud blob under cursor in erase mode
  snapToGrid: true,
  showBounds: true,     // draw dashed exclusion zone overlays
  showClickAreas: false,   // draw 128×128 click areas for all placed stars
  showCameraBorder: false, // draw a frame showing the camera viewport edges
  hoverCol: 0,          // grid cell the mouse is over
  hoverRow: 0,
  hoverWorldX: 0,       // unsnapped world position of cursor
  hoverWorldY: 0,
  hoverActive: false,   // true when mouse is over the canvas
  keys: { left: false, right: false, up: false },
  moveSpeed: 3,
  jumpForce: -8,
  onGround: false,
  cameraFollow: true,   // spacebar toggles; false = free pan mode
  pan: { active: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0, dragged: false },

  // Saved game state for restoring when exiting sandbox
  savedGameState: null,
  savedStarHooks: null,
  savedElements: null,
  savedCamera: null,
  savedCharacter: null,
  savedPhysics: null,
  savedChunkState: null,
  savedHookAlpha: 0,
  savedGridBaseX: 0,
  savedSelectedHook: null,
  savedStarConnected: true,
  savedInfiniteGen: null
};


// ─── Keyboard controls ────────────────────────────────────────────────────────

function sandboxSetupKeys() {
  var el = canvas.id;

  document.addEventListener('keydown', function(e) {
    if (gameState !== 'sandbox') return;
    if (e.which === 37) sandbox.keys.left = true;
    if (e.which === 39) sandbox.keys.right = true;
    if (e.which === 38) sandbox.keys.up = true;
    if (e.which === 82) sandboxRespawn();
    if (e.which === 32) { // spacebar: toggle camera follow
      e.preventDefault();
      sandbox.cameraFollow = !sandbox.cameraFollow;
      if (typeof sandboxSyncCameraBtn === 'function') sandboxSyncCameraBtn();
    }
    if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (sandbox.mode !== 'play') sandboxUndo();
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (sandbox.mode !== 'play') sandboxRedo();
    }
  });

  document.addEventListener('keyup', function(e) {
    if (e.which === 37) sandbox.keys.left = false;
    if (e.which === 39) sandbox.keys.right = false;
    if (e.which === 38) sandbox.keys.up = false;
  });

  // Mouse tracking for grid highlight + drag-to-pan
  el.addEventListener('mousemove', function(e) {
    if (gameState !== 'sandbox') return;
    var pos = screenToCamera(e.clientX, e.clientY);

    // Drag-to-pan
    if (sandbox.pan.active) {
      var pdx = pos.x - sandbox.pan.startX;
      var pdy = pos.y - sandbox.pan.startY;
      if (!sandbox.pan.dragged && (Math.abs(pdx) > 4 || Math.abs(pdy) > 4)) {
        sandbox.pan.dragged = true;
        if (sandbox.mode === 'build') {
          sandbox.cameraFollow = false;
          if (typeof sandboxSyncCameraBtn === 'function') sandboxSyncCameraBtn();
        }
      }
      if (sandbox.pan.dragged) {
        camera.x = sandbox.pan.camStartX + pdx / parallax.gamePanel;
        camera.y = sandbox.pan.camStartY + pdy / parallax.gamePanel;
      }
    }

    // Cloud drag-painting
    if (sandbox.cloudPainting && sandbox.tool === 'cloud') {
      sandboxPaintCloud(pos.x, pos.y);
    }

    // Erase drag
    if (sandbox.erasePainting && sandbox.tool === 'erase') {
      sandboxEraseAt(pos.x, pos.y);
    }

    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    var worldX = pos.x - gpx;
    var worldY = pos.y - gpy;
    sandbox.hoverCol = Math.round((worldX - gridBaseX) / gridSize.square);
    sandbox.hoverRow = Math.round(worldY / gridSize.square);
    sandbox.hoverWorldX = worldX;
    sandbox.hoverWorldY = worldY;
    sandbox.hoverActive = true;

    // Track hovered cloud for erase highlight
    sandbox.hoverCloudIdx = -1;
    if (sandbox.tool === 'erase') {
      sandbox.hoverCloudIdx = sandboxFindCloudAt(pos.x, pos.y);
    }
  });

  el.addEventListener('mouseleave', function() {
    sandbox.hoverActive = false;
    sandbox.pan.active = false;
  });

  el.addEventListener('mousedown', function(e) {
    if (gameState !== 'sandbox' || e.button !== 0) return;
    var pos = screenToCamera(e.clientX, e.clientY);
    // Cloud tool: start painting, skip panning
    if (sandbox.tool === 'cloud' && sandbox.mode === 'build') {
      sandbox.cloudPainting = true;
      sandbox.cloudLastPaintX = null;
      sandbox.cloudLastPaintY = null;
      sandboxPaintCloud(pos.x, pos.y);
      return;
    }
    // Erase tool: start drag-erasing, skip panning
    if (sandbox.tool === 'erase' && sandbox.mode === 'build') {
      sandbox.erasePainting = true;
      return;
    }
    sandbox.pan.active = true;
    sandbox.pan.startX = pos.x;
    sandbox.pan.startY = pos.y;
    sandbox.pan.camStartX = camera.x;
    sandbox.pan.camStartY = camera.y;
    sandbox.pan.dragged = false;
  });

  el.addEventListener('mouseup', function(e) {
    if (e.button !== 0) return;
    sandbox.pan.active = false;
    sandbox.cloudPainting = false;
    sandbox.cloudLastPaintX = null;
    sandbox.cloudLastPaintY = null;
    sandbox.erasePainting = false;
  });
}

function sandboxApplyMovement() {
  if (character.swinging) return;

  var accel = 0.5;
  var friction = 0.85;

  // Horizontal movement — accelerate toward target, friction to stop
  if (sandbox.keys.left) {
    physics.vx -= accel * dt;
    if (physics.vx < -sandbox.moveSpeed) physics.vx = -sandbox.moveSpeed;
  } else if (sandbox.keys.right) {
    physics.vx += accel * dt;
    if (physics.vx > sandbox.moveSpeed) physics.vx = sandbox.moveSpeed;
  } else {
    // Ease to stop
    physics.vx *= friction;
    if (Math.abs(physics.vx) < 0.1) physics.vx = 0;
  }

  // Jump
  if (sandbox.keys.up && sandbox.onGround) {
    physics.vy = sandbox.jumpForce;
    sandbox.onGround = false;
  }
}

function sandboxRespawn() {
  if (character.swinging) {
    starConnected = true;
    detach();
  }
  character.centerX = camera.width / 2;
  character.centerY = sandboxSpawnY();
  physics.vx = 0;
  physics.vy = 0;
  sandbox.onGround = false;
}

// Detect ground contact — character vy was positive (falling) and is now 0 (landed)
function sandboxCheckGround() {
  sandbox.onGround = (physics.vy === 0 && character.centerY > 0);
}


// ─── Cloud painter ─────────────────────────────────────────────────────────────

var _cloudParallaxMap = null;
function _getCloudParallax(layer) {
  // Lazily read parallax values — available after variables.js loads
  if (!_cloudParallaxMap) {
    _cloudParallaxMap = [parallax.cloud1, parallax.cloud2, parallax.cloud3];
  }
  return _cloudParallaxMap[layer - 1] || parallax.cloud1;
}

// Paint a cloud blob at screen position (sx, sy).
// Blobs are stored in cloud-layer space so they stay fixed relative to the cloud layer.
function sandboxPaintCloud(screenX, screenY) {
  var cp = _getCloudParallax(sandbox.cloudLayer);

  // Snap minimum distance to one grid cell so blobs stay grid-aligned
  var sq = gridSize.square;
  var minDist = sq;
  if (sandbox.cloudLastPaintX !== null) {
    var dx = screenX - sandbox.cloudLastPaintX;
    var dy = screenY - sandbox.cloudLastPaintY;
    if (dx * dx + dy * dy < minDist * minDist) return;
  }

  // Snap to grid in world space, then convert to cloud-layer coordinate
  var sq = gridSize.square;
  var snappedCol = Math.round((screenX - gridBaseX) / sq);
  var snappedRow = Math.round((screenY - camera.y * cp) / sq);
  var cloudX = gridBaseX + snappedCol * sq;
  var cloudY = snappedRow * sq;  // cloud-layer Y (camera-invariant)

  // Square blob — size is brush size snapped to grid
  var blobCells = Math.max(1, Math.round(sandbox.cloudBrushSize / sq));
  var side = blobCells * sq;

  var bx = Math.round(cloudX);
  var by = Math.round(cloudY);

  // Skip if this exact cell is already painted on this layer
  for (var di = 0; di < sandbox.clouds.length; di++) {
    var ex = sandbox.clouds[di];
    if (ex.layer === sandbox.cloudLayer && ex.x === bx && ex.y === by && ex.w === side && ex.h === side) return;
  }

  var blob = {
    x: bx,
    y: by,
    w: side,
    h: side,
    opacity: 1,
    layer: sandbox.cloudLayer
  };

  sandbox.clouds.push(blob);
  sandbox.redoStack = [];
  sandbox.placedItems.push({ type: 'cloud', index: sandbox.clouds.length - 1 });
  sandbox.cloudLastPaintX = screenX;
  sandbox.cloudLastPaintY = screenY;
  sandboxAutoSave();
}

// Offscreen canvas for per-layer compositing (overlapping blobs merge instead of stacking)
var _cloudOffscreen = null;
var _cloudOffscreenCtx = null;
var _cloudLayerOpacity = [0.12, 0.20, 0.32]; // 1=back, 2=mid, 3=front

// Draw user clouds — called from the RAF loop on canvas.context (screen-space).
// Each layer renders onto an offscreen canvas at full white, then composites
// onto the main context at the layer's opacity. Overlapping blobs within a
// layer merge into a single shape and never stack brighter.
function drawSandboxClouds(context) {
  if (sandbox.clouds.length === 0 && sandbox.hoverCloudIdx < 0) return;

  // Ensure offscreen canvas matches logical viewport
  if (!_cloudOffscreen || _cloudOffscreen.width !== camera.width || _cloudOffscreen.height !== camera.height) {
    _cloudOffscreen = document.createElement('canvas');
    _cloudOffscreen.width = camera.width;
    _cloudOffscreen.height = camera.height;
    _cloudOffscreenCtx = _cloudOffscreen.getContext('2d');
  }

  context.save();

  // Render each layer separately: all blobs → offscreen at 100% white, then
  // composite the offscreen onto the main context at the layer's opacity.
  for (var layerIdx = 0; layerIdx < 3; layerIdx++) {
    var layer = layerIdx + 1;
    var cp = _getCloudParallax(layer);

    _cloudOffscreenCtx.clearRect(0, 0, camera.width, camera.height);
    var hasBlobs = false;

    for (var i = 0; i < sandbox.clouds.length; i++) {
      var cl = sandbox.clouds[i];
      if (cl.layer !== layer) continue;
      if (i === sandbox.hoverCloudIdx && sandbox.tool === 'erase') continue;
      hasBlobs = true;
      var sx = cl.x;
      var sy = cl.y + camera.y * cp;
      _cloudOffscreenCtx.fillStyle = '#ffffff';
      _cloudOffscreenCtx.fillRect(sx - cl.w / 2, sy - cl.h / 2, cl.w, cl.h);
    }

    if (hasBlobs) {
      context.globalAlpha = _cloudLayerOpacity[layerIdx];
      context.drawImage(_cloudOffscreen, 0, 0);
    }
  }

  context.globalAlpha = 1;

  // Erase-mode hover highlight (drawn on top, unaffected by layer compositing)
  if (sandbox.hoverCloudIdx >= 0 && sandbox.hoverCloudIdx < sandbox.clouds.length && sandbox.tool === 'erase') {
    var cl = sandbox.clouds[sandbox.hoverCloudIdx];
    var cp = _getCloudParallax(cl.layer);
    var sx = cl.x;
    var sy = cl.y + camera.y * cp;
    context.fillStyle = 'rgba(255,60,60,0.18)';
    context.fillRect(sx - cl.w / 2, sy - cl.h / 2, cl.w, cl.h);
    context.strokeStyle = 'rgba(255,60,60,0.9)';
    context.lineWidth = 1.5;
    context.strokeRect(sx - cl.w / 2 + 0.5, sy - cl.h / 2 + 0.5, cl.w - 1, cl.h - 1);
    context.strokeStyle = 'rgba(255,60,60,0.5)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(sx - cl.w / 2, sy - cl.h / 2);
    context.lineTo(sx + cl.w / 2, sy + cl.h / 2);
    context.moveTo(sx + cl.w / 2, sy - cl.h / 2);
    context.lineTo(sx - cl.w / 2, sy + cl.h / 2);
    context.stroke();
  }

  context.restore();
}

// Remove the topmost cloud blob that the cursor overlaps
// Return index of topmost cloud blob at screen position, or -1
function sandboxFindCloudAt(screenX, screenY) {
  for (var i = sandbox.clouds.length - 1; i >= 0; i--) {
    var cl = sandbox.clouds[i];
    var cp = _getCloudParallax(cl.layer);
    var sx = cl.x;
    var sy = cl.y + camera.y * cp;
    if (screenX >= sx - cl.w / 2 - 4 && screenX <= sx + cl.w / 2 + 4 &&
        screenY >= sy - cl.h / 2 - 4 && screenY <= sy + cl.h / 2 + 4) {
      return i;
    }
  }
  return -1;
}

function sandboxEraseCloudAt(screenX, screenY) {
  var idx = sandboxFindCloudAt(screenX, screenY);
  if (idx >= 0) {
    sandbox.clouds.splice(idx, 1);
    sandboxAutoSave();
    return true;
  }
  return false;
}


// ─── Grid ──────────────────────────────────────────────────────────────────────
// Full-viewport grid for sandbox mode — extends across entire visible area

function drawSandboxGrid(context, viewLeft, viewRight, viewTop, viewBottom) {
  var sq = gridSize.square;

  var firstCol = Math.floor((viewLeft - gridBaseX) / sq);
  var lastCol = Math.ceil((viewRight - gridBaseX) / sq);
  var firstRow = Math.floor(viewTop / sq);
  var lastRow = Math.ceil(viewBottom / sq);

  context.strokeStyle = 'rgba(255,255,255,0.06)';
  context.lineWidth = 1;

  // Vertical lines
  for (var c = firstCol; c <= lastCol; c++) {
    var x = gridBaseX + c * sq;
    context.beginPath();
    context.moveTo(x, firstRow * sq);
    context.lineTo(x, lastRow * sq);
    context.stroke();
  }

  // Horizontal lines
  for (var r = firstRow; r <= lastRow; r++) {
    var y = r * sq;
    context.beginPath();
    context.moveTo(gridBaseX + firstCol * sq, y);
    context.lineTo(gridBaseX + lastCol * sq, y);
    context.stroke();
  }
}


// ─── Platforms ─────────────────────────────────────────────────────────────────

function sandboxCreatePlatform(col, row, isFloor) {
  var sq = gridSize.square;
  var x = gridBaseX + col * sq;
  var y = row * sq;

  // Check if a platform already exists at this cell
  for (var i = 0; i < sandbox.platforms.length; i++) {
    var p = sandbox.platforms[i];
    if (p.col === col && p.row === row) return; // already occupied
  }

  // Create collision surface (1 grid cell, full AABB)
  var surface = addSurface({
    x: x,
    y: y,
    width: sq,
    height: sq,
    parallax: 1.0,
    topOnly: false,
    active: true,
    tag: 'sandbox-platform'
  });

  var plat = {
    col: col,
    row: row,
    x: x,
    y: y,
    width: sq,
    height: sq,
    surface: surface,
    isFloor: isFloor || false
  };

  var platIndex = sandbox.platforms.length;
  sandbox.platforms.push(plat);
  if (!isFloor) {
    sandbox.placedItems.push({ type: 'platform', index: platIndex });
  }
}


function sandboxRemovePlatformAt(col, row) {
  for (var i = sandbox.platforms.length - 1; i >= 0; i--) {
    var p = sandbox.platforms[i];
    if (p.col === col && p.row === row) {
      removeSurface(p.surface);
      sandbox.platforms.splice(i, 1);
      return true;
    }
  }
  return false;
}


function sandboxDrawPlatforms(context) {
  for (var i = 0; i < sandbox.platforms.length; i++) {
    var p = sandbox.platforms[i];
    // Solid block with subtle border
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(p.x, p.y, p.width, p.height);
    context.strokeStyle = 'rgba(255,255,255,0.25)';
    context.lineWidth = 1;
    context.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
    // Top edge highlight (the collidable surface)
    context.strokeStyle = 'rgba(255,255,255,0.5)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(p.x, p.y);
    context.lineTo(p.x + p.width, p.y);
    context.stroke();
  }
}


// ─── Enter / Exit ──────────────────────────────────────────────────────────────

function sandboxEnter() {
  // Save current state (swap references, don't deep clone canvas objects)
  sandbox.savedGameState = gameState;
  sandbox.savedStarHooks = starHooks;
  sandbox.savedElements = elements;
  sandbox.savedSelectedHook = selectedHook;
  sandbox.savedStarConnected = starConnected;
  sandbox.savedHookAlpha = hookAlpha;
  sandbox.savedGridBaseX = gridBaseX;

  sandbox.savedCamera = {
    x: camera.x, y: camera.y,
    vx: camera.vx, vy: camera.vy,
    targetX: camera.targetX, targetY: camera.targetY,
    target: camera.target, ease: camera.ease,
    scrollX: camera.scrollX, scrollY: camera.scrollY
  };

  sandbox.savedCharacter = {
    centerX: character.centerX, centerY: character.centerY,
    swinging: character.swinging, size: character.size
  };

  sandbox.savedPhysics = {
    vx: physics.vx, vy: physics.vy,
    rope: physics.rope.slice(),
    ropeActive: physics.ropeActive,
    sparkles: physics.sparkles.slice(),
    segmentLength: physics.segmentLength,
    initialSegmentLength: physics.initialSegmentLength,
    targetSegmentLength: physics.targetSegmentLength
  };

  sandbox.savedInfiniteGen = {
    startX: infiniteGen.startX,
    maxDistance: infiniteGen.maxDistance
  };

  sandbox.savedChunkState = {
    loadedChunks: chunkManager.loadedChunks,
    lastCenterChunk: chunkManager.lastCenterChunk
  };

  // Reset for sandbox — start fresh
  starHooks = [];
  elements = [];
  selectedHook = null;
  starConnected = true;
  chunkManager.reset();

  // Reset physics
  physics.vx = 0;
  physics.vy = 0;
  physics.rope = [];
  physics.ropeActive = false;
  physics.sparkles = [];

  // Reset character — position above the floor
  character.swinging = false;
  character.centerX = camera.width / 2;
  character.centerY = sandboxSpawnY();

  // Reset camera
  camera.x = 0;
  camera.y = 0;
  camera.vx = 0;
  camera.vy = 0;
  camera.targetX = 0;
  camera.targetY = 0;
  camera.target = null;

  // Set grid origin so hooks are nicely aligned
  gridBaseX = 0;

  // Hooks fully visible
  hookAlpha = 1;

  // Clear placed items
  sandbox.platforms = [];
  sandbox.clouds = [];
  sandbox.hooks = [];
  sandbox.placedItems = [];

  // Build floor from platform blocks — 4 grid cells above the bottom of the viewport
  sandboxBuildFloor();

  // Clear game panel
  gamePanel.context.clearRect(0, 0, gamePanel.canvas.width, gamePanel.canvas.height);
  drawClicky();

  // Switch state — always start in Build mode
  gameState = 'sandbox';
  sandbox.active = true;
  sandbox.mode = 'build';
  sandbox.paused = false;
  sandbox.frameStepQueued = 0;
  sandbox.keys = { left: false, right: false, up: false };
  sandbox.onGround = false;

  // Show sandbox panel, hide others
  var panel = document.getElementById('sandbox-panel');
  if (panel) panel.style.display = 'flex';
  var debugEl = document.getElementById('debug-panel');
  if (debugEl) debugEl.style.display = 'none';
  var autoEl = document.getElementById('autoplay-panel');
  if (autoEl) autoEl.style.display = 'none';
}


// Direct sandbox init for sandbox.html — no state save/restore needed
function sandboxInit() {
  starHooks = [];
  elements = [];
  selectedHook = null;
  starConnected = true;

  physics.vx = 0;
  physics.vy = 0;
  physics.rope = [];
  physics.ropeActive = false;
  physics.sparkles = [];

  character.swinging = false;
  character.centerX = camera.width / 2;
  character.centerY = sandboxSpawnY();

  camera.x = 0;
  camera.y = 0;
  camera.vx = 0;
  camera.vy = 0;
  camera.targetX = 0;
  camera.targetY = 0;
  camera.target = null;

  gridBaseX = 0;
  hookAlpha = 1;

  sandbox.platforms = [];
  sandbox.clouds = [];
  sandbox.hooks = [];
  sandbox.placedItems = [];

  sandboxBuildFloor();

  // Auto-load saved level from localStorage
  try {
    var saved = localStorage.getItem('aibek-sandbox-level');
    if (saved) {
      var data = JSON.parse(saved);
      if (data.gridBaseX !== undefined) gridBaseX = data.gridBaseX;
      if (data.hooks) {
        for (var i = 0; i < data.hooks.length; i++) {
          var h = data.hooks[i];
          var hookIndex = starHooks.length;
          createHook(h.col, h.row, true, -1);
          if (h.immune) { starHooks[hookIndex].star.immune = true; drawHook(starHooks[hookIndex]); }
          sandbox.hooks.push(hookIndex);
          sandbox.placedItems.push({ type: 'star', index: hookIndex });
        }
      }
      if (data.platforms) {
        for (var i = 0; i < data.platforms.length; i++) {
          var p = data.platforms[i];
          sandboxCreatePlatform(p.col, p.row, false);
        }
      }
      if (data.shooting) {
        for (var i = 0; i < data.shooting.length; i++) {
          var ss = data.shooting[i];
          var newSS = createShootingStar(ss.col, ss.row, ss.span || 8);
          sandbox.placedItems.push({ type: 'shooting', ref: newSS });
        }
      }
      if (data.clouds) {
        sandbox.clouds = data.clouds.slice();
      }
      if (data.settings) {
        var s = data.settings;
        if (s.tool          !== undefined) sandbox.tool          = s.tool;
        if (s.showBounds    !== undefined) sandbox.showBounds    = s.showBounds;
        if (s.showClickAreas!== undefined) sandbox.showClickAreas= s.showClickAreas;
        if (s.snapToGrid    !== undefined) sandbox.snapToGrid    = s.snapToGrid;
        if (s.cameraFollow  !== undefined) sandbox.cameraFollow  = s.cameraFollow;
        if (s.gravity       !== undefined && typeof debugGravityEnabled !== 'undefined') {
          debugGravityEnabled = s.gravity;
        }
      }
      // Always start in Build mode
      sandbox.paused = false;
      sandbox.mode = 'build';
    }
  } catch (e) {}

  gamePanel.context.clearRect(0, 0, gamePanel.canvas.width, gamePanel.canvas.height);
  drawClicky();

  gameState = 'sandbox';
  sandbox.active = true;
  // sandbox.paused is set by loaded settings (or defaults to false via mode)
  sandbox.frameStepQueued = 0;
  sandbox.keys = { left: false, right: false, up: false };
  sandbox.onGround = false;

  var panel = document.getElementById('sandbox-panel');
  if (panel) panel.style.display = 'flex';
}


function sandboxExit() {
  // Remove all sandbox platform surfaces
  for (var i = 0; i < sandbox.platforms.length; i++) {
    removeSurface(sandbox.platforms[i].surface);
  }
  sandbox.platforms = [];
  sandbox.clouds = [];
  sandbox.placedItems = [];

  // Detach if swinging
  if (character.swinging) {
    starConnected = true;
    detach();
  }

  // Restore saved state
  starHooks = sandbox.savedStarHooks || [];
  elements = sandbox.savedElements || [];
  selectedHook = sandbox.savedSelectedHook;
  starConnected = sandbox.savedStarConnected;
  hookAlpha = sandbox.savedHookAlpha;
  gridBaseX = sandbox.savedGridBaseX;

  if (sandbox.savedCamera) {
    camera.x = sandbox.savedCamera.x;
    camera.y = sandbox.savedCamera.y;
    camera.vx = sandbox.savedCamera.vx;
    camera.vy = sandbox.savedCamera.vy;
    camera.targetX = sandbox.savedCamera.targetX;
    camera.targetY = sandbox.savedCamera.targetY;
    camera.target = sandbox.savedCamera.target;
    camera.ease = sandbox.savedCamera.ease;
    camera.scrollX = sandbox.savedCamera.scrollX;
    camera.scrollY = sandbox.savedCamera.scrollY;
  }

  if (sandbox.savedCharacter) {
    character.centerX = sandbox.savedCharacter.centerX;
    character.centerY = sandbox.savedCharacter.centerY;
    character.swinging = sandbox.savedCharacter.swinging;
  }

  if (sandbox.savedPhysics) {
    physics.vx = sandbox.savedPhysics.vx;
    physics.vy = sandbox.savedPhysics.vy;
    physics.rope = sandbox.savedPhysics.rope;
    physics.ropeActive = sandbox.savedPhysics.ropeActive;
    physics.sparkles = sandbox.savedPhysics.sparkles;
    physics.segmentLength = sandbox.savedPhysics.segmentLength;
    physics.initialSegmentLength = sandbox.savedPhysics.initialSegmentLength;
    physics.targetSegmentLength = sandbox.savedPhysics.targetSegmentLength;
  }

  if (sandbox.savedInfiniteGen) {
    infiniteGen.startX = sandbox.savedInfiniteGen.startX;
    infiniteGen.maxDistance = sandbox.savedInfiniteGen.maxDistance;
  }

  if (sandbox.savedChunkState) {
    chunkManager.loadedChunks = sandbox.savedChunkState.loadedChunks;
    chunkManager.lastCenterChunk = sandbox.savedChunkState.lastCenterChunk;
  }

  // Remove all shooting stars
  removeAllShootingStars();

  drawClicky();

  gameState = sandbox.savedGameState || 'loading';
  sandbox.active = false;

  if (!sandbox.savedGameState || sandbox.savedGameState === 'sandbox') {
    gameState = 'loading';
    setupLoading();
  }

  // Hide sandbox panel, show debug
  var panel = document.getElementById('sandbox-panel');
  if (panel) panel.style.display = 'none';
  var debugEl = document.getElementById('debug-panel');
  if (debugEl) debugEl.style.display = '';
  var autoEl = document.getElementById('autoplay-panel');
  if (autoEl) autoEl.style.display = '';
}


// ─── Reset / Undo ──────────────────────────────────────────────────────────────

function sandboxReset(skipSnapshot) {
  // Capture snapshot before clearing so Clear can be undone
  var snapshot = skipSnapshot ? null : sandboxExportLevel();
  if (!skipSnapshot) sandbox.redoStack = [];

  if (character.swinging) {
    starConnected = true;
    detach();
  }

  // Remove all shooting stars, hooks, platforms
  removeAllShootingStars();
  starHooks = [];
  elements = [];
  selectedHook = null;
  starConnected = true;
  sandbox.hooks = [];

  for (var i = 0; i < sandbox.platforms.length; i++) {
    removeSurface(sandbox.platforms[i].surface);
  }
  sandbox.platforms = [];
  sandbox.clouds = [];
  sandbox.placedItems = [];

  // Push clear sentinel so Undo can restore it
  if (snapshot) {
    sandbox.placedItems.push({ type: 'clear', snapshot: snapshot });
  }

  // Reset character — position above the floor
  character.swinging = false;
  character.centerX = camera.width / 2;
  character.centerY = sandboxSpawnY();
  physics.vx = 0;
  physics.vy = 0;
  physics.rope = [];
  physics.ropeActive = false;
  physics.sparkles = [];

  // Reset camera
  camera.x = 0;
  camera.y = 0;
  camera.vx = 0;
  camera.vy = 0;
  camera.target = null;

  gamePanel.context.clearRect(0, 0, gamePanel.canvas.width, gamePanel.canvas.height);
  drawClicky();

  // Rebuild floor from platform blocks
  sandboxBuildFloor();
}


function sandboxFloorRow() {
  // Floor row that puts camera.y ≈ 0 (clouds at neutral parallax) when character stands on it.
  // camera.y = 0 when character.centerY = camera.height/2.
  // Character feet = centerY + size/2 → floor top at camera.height/2 + size/2.
  return Math.round((camera.height / 2 + character.size / 2) / gridSize.square);
}

function sandboxSpawnY() {
  return sandboxFloorRow() * gridSize.square - character.size - 4;
}

function sandboxBuildFloor() {
  var floorRow = sandboxFloorRow();
  var floorColStart = Math.floor(-camera.width / gridSize.square);
  var floorColEnd = Math.ceil((camera.width * 2) / gridSize.square);
  for (var c = floorColStart; c < floorColEnd; c++) {
    sandboxCreatePlatform(c, floorRow, true); // isFloor = true, excluded from saves
  }
}


function sandboxUndo() {
  if (sandbox.placedItems.length === 0) return;
  // Snapshot current state so redo can restore it
  sandbox.redoStack.push({ level: sandboxExportLevel(), items: sandbox.placedItems.slice() });
  var last = sandbox.placedItems.pop();

  if (last.type === 'star') {
    // Remove the star hook at the given index
    var idx = last.index;
    if (idx >= 0 && idx < starHooks.length) {
      starHooks.splice(idx, 1);
      // Rebuild elements (indices shift)
      elements = [];
      for (var i = 0; i < starHooks.length; i++) {
        starHooks[i].star.index = i;
        var clickyBounds = 32;
        elements.push({
          posX: starHooks[i].posX - clickyBounds,
          posY: starHooks[i].posY - clickyBounds,
          size: 64 + (clickyBounds * 2),
          index: i,
          chunkIndex: -1
        });
      }
      drawClicky();
    }
  } else if (last.type === 'platform') {
    var idx = last.index;
    if (idx >= 0 && idx < sandbox.platforms.length) {
      removeSurface(sandbox.platforms[idx].surface);
      sandbox.platforms.splice(idx, 1);
    }
  } else if (last.type === 'shooting') {
    if (last.ref) {
      removeShootingStar(last.ref);
      sandboxRebuildElements();
      drawClicky();
    }
  } else if (last.type === 'cloud') {
    // Remove the last painted cloud blob
    if (last.index >= 0 && last.index < sandbox.clouds.length) {
      sandbox.clouds.splice(last.index, 1);
    }
  } else if (last.type === 'clear') {
    sandboxImportLevel(last.snapshot);
    sandboxAutoSave();
    return;
  }
  sandboxAutoSave();
}


function sandboxRedo() {
  if (sandbox.redoStack.length === 0) return;
  var next = sandbox.redoStack.pop();
  sandboxImportLevel(next.level);
  // Restore exact undo history from the snapshot (import rebuilds placedItems generically)
  sandbox.placedItems = next.items;
  sandboxAutoSave();
}


function sandboxDeleteLastHook() {
  sandboxUndo();
}


// ─── Update loop ───────────────────────────────────────────────────────────────

function updateGame_sandbox() {
  var gameCanvas = gamePanel.canvas;
  var gameContext = gamePanel.context;

  gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  var gpx = camera.x * parallax.gamePanel;
  var gpy = camera.y * parallax.gamePanel;
  gameContext.save();
  gameContext.translate(gpx, gpy);

  var viewLeft = -gpx - 200;
  var viewRight = -gpx + camera.width + 200;
  var viewTop = -gpy - 200;
  var viewBottom = -gpy + camera.height + 200;

  // Full-viewport grid
  drawSandboxGrid(gameContext, viewLeft, viewRight, viewTop, viewBottom);

  // Tool hover highlight
  if (sandbox.hoverActive && sandbox.tool !== '') {
    var sq = gridSize.square;
    var hx = gridBaseX + sandbox.hoverCol * sq;
    var hy = sandbox.hoverRow * sq;
    // Center of the 64×64 star canvas (not the 32px grid cell)
    var cx = hx + 32;
    var cy = hy + 32;

    // Check if placement would overlap something existing
    var hoverBlocked = false;
    if (sandbox.tool === 'star' || sandbox.tool === 'immune') {
      var starCandidateX = hx - 32; // star posX when centered on cursor
      var starCandidateY = hy - 32;
      hoverBlocked = sandboxStarOverlaps(starCandidateX, starCandidateY);
    } else if (sandbox.tool === 'platform') {
      // Check if this cell is already occupied
      for (var pi = 0; pi < sandbox.platforms.length; pi++) {
        if (sandbox.platforms[pi].col === sandbox.hoverCol && sandbox.platforms[pi].row === sandbox.hoverRow) {
          hoverBlocked = true;
          break;
        }
      }
    } else if (sandbox.tool === 'shooting') {
      hoverBlocked = sandboxShootingOverlaps(sandbox.hoverCol, sandbox.hoverRow, 8);
    }

    // Tool-matched palette — green=star, cyan=immune, yellow=shooting, white=platform
    var _toolRGB = (sandbox.tool === 'immune')   ? '64,224,255'
                 : (sandbox.tool === 'shooting') ? '255,200,0'
                 : (sandbox.tool === 'star')     ? '48,192,64'
                 :                                 '255,255,255';
    // Override to red when placement is blocked
    if (hoverBlocked) _toolRGB = '255,80,80';
    var zoneColor   = 'rgba(' + _toolRGB + ',0.3)';
    var borderColor = 'rgba(' + _toolRGB + ',0.8)';
    var fillColor   = 'rgba(' + _toolRGB + ',0.08)';
    var accentColor = 'rgba(' + _toolRGB + ',0.9)';
    var dotColor    = 'rgba(' + _toolRGB + ',0.6)';

    var showCA = sandbox.showClickAreas;

    gameContext.save();

    if (sandbox.tool === 'star' || sandbox.tool === 'immune') {
      // Star is 64×64, centered on the cursor (hx, hy).
      // Draw offset so the cursor sits at the center, not the corner.
      var clickyBounds = 32;
      var starSize = 64;
      var starDrawX = hx - starSize / 2;      // hx - 32
      var starDrawY = hy - starSize / 2;      // hy - 32
      var zoneX = starDrawX - clickyBounds;   // hx - 96 (full 128×128 exclusion zone)
      var zoneY = starDrawY - clickyBounds;   // hy - 96
      var zoneW = starSize + clickyBounds * 2; // 128
      var zoneH = starSize + clickyBounds * 2; // 128

      // Bounds — solid 128×128 box, always shown while placing
      gameContext.strokeStyle = borderColor;
      gameContext.lineWidth = 2;
      gameContext.setLineDash([]);
      gameContext.strokeRect(zoneX + 1, zoneY + 1, zoneW - 2, zoneH - 2);

      // Hit area — dashed + fill when showClickAreas is on
      if (showCA) {
        gameContext.strokeStyle = 'rgba(0,255,120,0.6)';
        gameContext.lineWidth = 1;
        gameContext.setLineDash([3, 3]);
        gameContext.strokeRect(zoneX + 0.5, zoneY + 0.5, zoneW - 1, zoneH - 1);
        gameContext.setLineDash([]);
        gameContext.fillStyle = 'rgba(0,255,120,0.06)';
        gameContext.fillRect(zoneX, zoneY, zoneW, zoneH);
      }

      // Star ring centered on cursor
      gameContext.strokeStyle = accentColor;
      gameContext.lineWidth = 1.5;
      gameContext.beginPath();
      gameContext.arc(hx, hy, 22, 0, Math.PI * 2);
      gameContext.stroke();

      // Center dot — always white
      gameContext.fillStyle = 'rgba(255,255,255,0.9)';
      gameContext.beginPath();
      gameContext.arc(hx, hy, 4, 0, Math.PI * 2);
      gameContext.fill();

    } else if (sandbox.tool === 'platform') {
      // Platform is 32×32, cursor at top-left corner (grid-aligned)
      var platSize = sq;
      var platCx = hx + platSize / 2;
      var platCy = hy + platSize / 2;

      // Dashed outer zone — only when hit areas are visible
      if (showCA) {
        gameContext.strokeStyle = zoneColor;
        gameContext.lineWidth = 1;
        gameContext.setLineDash([4, 4]);
        gameContext.strokeRect(hx + 0.5, hy + 0.5, platSize - 1, platSize - 1);
        gameContext.setLineDash([]);
      }

      // Solid footprint fill + border
      gameContext.fillStyle = fillColor;
      gameContext.fillRect(hx, hy, platSize, platSize);
      gameContext.strokeStyle = borderColor;
      gameContext.lineWidth = 1;
      gameContext.strokeRect(hx + 0.5, hy + 0.5, platSize - 1, platSize - 1);

      // Top edge accent (collidable surface)
      gameContext.strokeStyle = accentColor;
      gameContext.lineWidth = 2;
      gameContext.beginPath();
      gameContext.moveTo(hx, hy);
      gameContext.lineTo(hx + platSize, hy);
      gameContext.stroke();

      // Center dot
      gameContext.fillStyle = dotColor;
      gameContext.beginPath();
      gameContext.arc(platCx, platCy, 3, 0, Math.PI * 2);
      gameContext.fill();

    } else if (sandbox.tool === 'cloud') {
      // Show grid-snapped square brush footprint at cursor
      var sq2 = gridSize.square;
      var blobCells2 = Math.max(1, Math.round(sandbox.cloudBrushSize / sq2));
      var side2 = blobCells2 * sq2;
      var bx = Math.round(hx / sq2) * sq2 - side2 / 2;
      var by = Math.round(hy / sq2) * sq2 - side2 / 2;
      gameContext.fillStyle = 'rgba(255,255,255,0.12)';
      gameContext.fillRect(bx, by, side2, side2);
      gameContext.strokeStyle = 'rgba(255,255,255,0.45)';
      gameContext.lineWidth = 1;
      gameContext.setLineDash([4, 3]);
      gameContext.strokeRect(bx + 0.5, by + 0.5, side2 - 1, side2 - 1);
      gameContext.setLineDash([]);

    } else if (sandbox.tool === 'erase') {
      var wx = sandbox.hoverWorldX;
      var wy = sandbox.hoverWorldY;
      var eraseStarIdx = sandboxFindStarAtWorld(wx, wy);
      // If the hovered star belongs to a shooting star, treat as a shooting star erase
      var eraseSStar = sandboxFindShootingStarAt(wx, wy);
      if (!eraseSStar && eraseStarIdx >= 0 && typeof shootingStarHooks !== 'undefined') {
        var hoveredHook = starHooks[eraseStarIdx];
        for (var si = 0; si < shootingStarHooks.length; si++) {
          if (shootingStarHooks[si].hook === hoveredHook) {
            eraseSStar = shootingStarHooks[si];
            eraseStarIdx = -1; // treat as shooting star, not standalone star
            break;
          }
        }
      }
      var erasePlatIdx = sandboxFindPlatformAtWorld(wx, wy);

      // Shared erase highlight: red fill + solid border + diagonal X across element
      var ex, ey, ew, eh_dim;
      if (eraseSStar) {
        ex = eraseSStar.originX; ey = eraseSStar.originY; ew = eraseSStar.regionSize; eh_dim = ew;
      } else if (eraseStarIdx >= 0) {
        var eh = starHooks[eraseStarIdx];
        var eCB = 32;
        ex = eh.posX - eCB; ey = eh.posY - eCB; ew = 64 + eCB * 2; eh_dim = ew;
      } else if (erasePlatIdx >= 0) {
        var ep = sandbox.platforms[erasePlatIdx];
        ex = ep.x; ey = ep.y; ew = ep.width; eh_dim = ep.height;
      } else {
        // Nothing under cursor — small cursor indicator
        ex = hx; ey = hy; ew = sq; eh_dim = sq;
      }

      // Fill
      gameContext.fillStyle = 'rgba(255,60,60,0.08)';
      gameContext.fillRect(ex, ey, ew, eh_dim);
      // Border
      gameContext.strokeStyle = 'rgba(255,60,60,0.9)';
      gameContext.lineWidth = 1.5;
      gameContext.strokeRect(ex + 0.5, ey + 0.5, ew - 1, eh_dim - 1);
      // X across element
      gameContext.strokeStyle = 'rgba(255,60,60,0.45)';
      gameContext.lineWidth = 1;
      gameContext.beginPath();
      gameContext.moveTo(ex, ey);         gameContext.lineTo(ex + ew, ey + eh_dim);
      gameContext.moveTo(ex + ew, ey);    gameContext.lineTo(ex, ey + eh_dim);
      gameContext.stroke();

    } else if (sandbox.tool === 'shooting') {
      // Shooting star: 8×8 grid region, top-left at cursor
      var span = 8;
      var regionSize = span * sq; // 256px
      var rCx = hx + regionSize / 2;
      var rCy = hy + regionSize / 2;

      // Bounds — solid region border, always shown while placing
      gameContext.strokeStyle = borderColor;
      gameContext.lineWidth = 2;
      gameContext.setLineDash([]);
      gameContext.strokeRect(hx + 1, hy + 1, regionSize - 2, regionSize - 2);

      // Hit area — dashed + fill when showClickAreas is on
      if (showCA) {
        gameContext.strokeStyle = 'rgba(255,200,0,0.6)';
        gameContext.lineWidth = 1;
        gameContext.setLineDash([3, 3]);
        gameContext.strokeRect(hx + 0.5, hy + 0.5, regionSize - 1, regionSize - 1);
        gameContext.setLineDash([]);
        gameContext.fillStyle = 'rgba(255,200,0,0.06)';
        gameContext.fillRect(hx, hy, regionSize, regionSize);
      }

      // Diagonal travel path
      gameContext.strokeStyle = accentColor;
      gameContext.lineWidth = 1;
      gameContext.setLineDash([6, 6]);
      gameContext.beginPath();
      gameContext.moveTo(hx, hy);
      gameContext.lineTo(hx + regionSize, hy + regionSize);
      gameContext.stroke();
      gameContext.setLineDash([]);

      // Star ring at start position (top-left of region)
      var ssCx = hx + 32;
      var ssCy = hy + 32;
      gameContext.strokeStyle = accentColor;
      gameContext.lineWidth = 1.5;
      gameContext.beginPath();
      gameContext.arc(ssCx, ssCy, 22, 0, Math.PI * 2);
      gameContext.stroke();

      // Center dot — always white
      gameContext.fillStyle = 'rgba(255,255,255,0.9)';
      gameContext.beginPath();
      gameContext.arc(ssCx, ssCy, 4, 0, Math.PI * 2);
      gameContext.fill();

      // Arrow at end of path
      gameContext.fillStyle = accentColor;
      gameContext.beginPath();
      var ax = hx + regionSize, ay = hy + regionSize;
      gameContext.moveTo(ax, ay);
      gameContext.lineTo(ax - 10, ay - 4);
      gameContext.lineTo(ax - 4, ay - 10);
      gameContext.closePath();
      gameContext.fill();
    }

    gameContext.restore();
  }

  // Platforms
  sandboxDrawPlatforms(gameContext);

  // Movement + physics
  sandboxApplyMovement();

  if (character.swinging === true) {
    if (testingBool === true) {
      drawTrajectory(gameContext);
    }
    if (typeof debugGrappleAssist !== 'undefined' && debugGrappleAssist === true) {
      drawGrappleAssist(gameContext);
    }
    drawRope(gameContext);
  }
  if (character.swinging === false) {
    characterFalling(gameContext);
    sandboxCheckGround();
  }

  // Sparkles
  if (physics.sparkles.length > 0 && !character.swinging) {
    physicsUpdateSparkles(dt, gameContext);
  }

  // Grapple launch animation
  if (hookGrappel.launch === true) {
    grappelLaunch(gamePanel.context);
  }

  // Update and draw shooting star hooks
  updateShootingStarHooks();
  drawShootingStarHooks(gameContext);

  // Draw selected hook highlight
  if (selectedHook != null) {
    drawHook(selectedHook);
  }

  // Animate dying stars (keep supernova running after the player detaches)
  for (var di = 0; di < starHooks.length; di++) {
    if (starHooks[di].star.dying && starHooks[di] !== selectedHook) {
      drawHook(starHooks[di]);
    }
  }

  // Draw all hooks (culled to visible). Skip stars whose death animation has finished.
  for (var i = 0; i < starHooks.length; i++) {
    var hook = starHooks[i];
    if (hook.star.alive === false) continue;
    if (hook.posX + hook.size >= viewLeft && hook.posX <= viewRight) {
      gameContext.drawImage(hook.layer, hook.posX, hook.posY);
    }
  }

  // Placed-item overlays — Bounds: solid border; Hit Areas: dashed border + fill.
  // Both reference the same footprint so they align without overlapping.
  var showBounds = sandbox.showBounds;
  var showCA     = sandbox.showClickAreas;
  var caBounds = 32;
  var caSize = 64 + caBounds * 2; // 128

  if (showBounds || showCA) {
    // Regular stars — footprint is 128×128 centered on the star canvas
    for (var ci = 0; ci < starHooks.length; ci++) {
      var ch = starHooks[ci];
      var isShooting = false;
      if (typeof shootingStarHooks !== 'undefined') {
        for (var si = 0; si < shootingStarHooks.length; si++) {
          if (shootingStarHooks[si].hook === ch) { isShooting = true; break; }
        }
      }
      if (isShooting) continue;

      var rx = ch.posX - caBounds, ry = ch.posY - caBounds;
      // Color matches star type: green for standard, cyan for immune
      var isImmuneHook = !!ch.star.immune;
      var caRGB = isImmuneHook ? '64,224,255' : '48,192,64';

      // Bounds: type-colored solid border (placement exclusion zone)
      if (showBounds) {
        gameContext.strokeStyle = 'rgba(' + caRGB + ',0.6)';
        gameContext.lineWidth = 2;
        gameContext.setLineDash([]);
        gameContext.strokeRect(rx + 1, ry + 1, caSize - 2, caSize - 2);
      }

      // Hit area: dashed border + background fill (grapple click target)
      if (showCA) {
        gameContext.strokeStyle = 'rgba(0,255,120,0.6)';
        gameContext.lineWidth = 1;
        gameContext.setLineDash([3, 3]);
        gameContext.strokeRect(rx + 0.5, ry + 0.5, caSize - 1, caSize - 1);
        gameContext.setLineDash([]);
        gameContext.fillStyle = 'rgba(0,255,120,0.06)';
        gameContext.fillRect(rx, ry, caSize, caSize);
      }
    }

    // Shooting star regions — footprint is the full travel region
    if (typeof shootingStarHooks !== 'undefined') {
      for (var si = 0; si < shootingStarHooks.length; si++) {
        var ss = shootingStarHooks[si];
        // Bounds: solid border
        if (showBounds) {
          gameContext.strokeStyle = 'rgba(255,200,0,0.8)';
          gameContext.lineWidth = 2;
          gameContext.setLineDash([]);
          gameContext.strokeRect(ss.originX + 1, ss.originY + 1, ss.regionSize - 2, ss.regionSize - 2);
        }
        // Hit area: dashed border + fill
        if (showCA) {
          gameContext.strokeStyle = 'rgba(255,200,0,0.6)';
          gameContext.lineWidth = 1.5;
          gameContext.setLineDash([3, 3]);
          gameContext.strokeRect(ss.originX + 0.5, ss.originY + 0.5, ss.regionSize - 1, ss.regionSize - 1);
          gameContext.setLineDash([]);
          gameContext.fillStyle = 'rgba(255,200,0,0.06)';
          gameContext.fillRect(ss.originX, ss.originY, ss.regionSize, ss.regionSize);
        }
      }
    }
    gameContext.setLineDash([]);
  }

  gameContext.restore();

  // Camera — follow character or free pan (spacebar toggles, drag also disengages follow)
  camera.target = null; // prevent updateCamera from overriding
  if (sandbox.cameraFollow) {
    var targetCamX = -(character.centerX - camera.width / 2);
    var targetCamY = -(character.centerY - camera.height / 2);
    var prevX = camera.x;
    var prevY = camera.y;
    camera.x += (targetCamX - camera.x) * 0.08 * dt;
    camera.y += (targetCamY - camera.y) * 0.08 * dt;
    camera.vx = camera.x - prevX;
    camera.vy = camera.y - prevY;
    camera.scrollX += camera.vx;
    camera.scrollY += camera.vy;
  } else {
    camera.vx = 0;
    camera.vy = 0;
  }

  // Update sidebar stats
  if (sandbox._updateStats) sandbox._updateStats();
}


// ─── Click handling ────────────────────────────────────────────────────────────

// Erase whatever is under the cursor — called on click and on drag-erase
function sandboxEraseAt(mouseX, mouseY, worldX, worldY, col, row) {
  // Compute world coords if not provided
  if (worldX === undefined) {
    var gpx = camera.x * parallax.gamePanel;
    var gpy = camera.y * parallax.gamePanel;
    worldX = mouseX - gpx;
    worldY = mouseY - gpy;
    col = Math.round((worldX - gridBaseX) / gridSize.square);
    row = Math.round(worldY / gridSize.square);
  }

  if (sandboxEraseCloudAt(mouseX, mouseY)) return;

  var hitSS = sandboxFindShootingStarAt(worldX, worldY);
  if (hitSS) {
    removeShootingStar(hitSS);
    sandboxRebuildElements();
    drawClicky();
    return;
  }

  var closestIndex = sandboxFindHookAt(mouseX, mouseY);
  if (closestIndex >= 0) {
    var matchedHook = starHooks[closestIndex];
    var ownerSS = null;
    if (typeof shootingStarHooks !== 'undefined') {
      for (var si = 0; si < shootingStarHooks.length; si++) {
        if (shootingStarHooks[si].hook === matchedHook) { ownerSS = shootingStarHooks[si]; break; }
      }
    }
    if (ownerSS) { removeShootingStar(ownerSS); }
    else         { starHooks.splice(closestIndex, 1); }
    sandboxRebuildElements();
    drawClicky();
    return;
  }

  sandboxRemovePlatformAt(col, row);
}


function sandboxClick(mouseX, mouseY) {
  if (sandbox.pan.dragged) return; // was a drag, not a click
  var gpx = camera.x * parallax.gamePanel;
  var gpy = camera.y * parallax.gamePanel;
  var worldX = mouseX - gpx;
  var worldY = mouseY - gpy;

  // Grid cell under cursor
  var col = Math.round((worldX - gridBaseX) / gridSize.square);
  var row = Math.round(worldY / gridSize.square);

  // ── Play mode: grapple only, no placement ──
  if (sandbox.mode === 'play') {
    var hookIdx = sandboxFindHookAt(mouseX, mouseY);
    if (hookIdx >= 0) {
      changeHook(hookIdx);
      return;
    }
    if (character.swinging) detach();
    return; // never place in play mode
  }

  // ── Build mode: tools only, no grappling ──

  // ── Erase tool ──
  if (sandbox.tool === 'erase') {
    sandboxEraseAt(mouseX, mouseY, worldX, worldY, col, row);
    return;
  }

  // ── Place tools — only reached when not clicking a star and not swinging ──
  if (sandbox.tool === 'star' || sandbox.tool === 'immune') {
    sandboxPlaceHook(mouseX, mouseY);
  } else if (sandbox.tool === 'platform') {
    sandbox.redoStack = [];
    sandboxCreatePlatform(col, row);
  } else if (sandbox.tool === 'shooting') {
    if (sandboxShootingOverlaps(col, row, 8)) return;
    sandbox.redoStack = [];
    var ss = createShootingStar(col, row, 8);
    sandbox.placedItems.push({ type: 'shooting', ref: ss });
    drawClicky();
  }
  sandboxAutoSave();
}


// Find the hook index at a screen position, or -1
function sandboxFindHookAt(mouseX, mouseY) {
  var closestDist = Infinity;
  var closestIndex = -1;
  var gpx = camera.x * parallax.gamePanel;
  var gpy = camera.y * parallax.gamePanel;

  elements.forEach(function(element) {
    var screenX = element.posX + gpx;
    var screenY = element.posY + gpy;
    if (mouseX > screenX && mouseX < screenX + element.size
      && mouseY > screenY && mouseY < screenY + element.size) {
      var centerX = screenX + element.size / 2;
      var centerY = screenY + element.size / 2;
      var dx = mouseX - centerX;
      var dy = mouseY - centerY;
      var dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = element.index;
      }
    }
  });

  return closestIndex;
}


// Find a shooting star whose region contains the given world position
function sandboxFindShootingStarAt(worldX, worldY) {
  if (typeof shootingStarHooks === 'undefined') return null;
  for (var i = 0; i < shootingStarHooks.length; i++) {
    var ss = shootingStarHooks[i];
    if (worldX >= ss.originX && worldX < ss.originX + ss.regionSize &&
        worldY >= ss.originY && worldY < ss.originY + ss.regionSize) {
      return ss;
    }
  }
  return null;
}

// Find a star hook whose click area (128×128) contains the world position
function sandboxFindStarAtWorld(worldX, worldY) {
  var clickBounds = 32;
  var clickSize = 128;
  for (var i = 0; i < starHooks.length; i++) {
    var h = starHooks[i];
    if (worldX >= h.posX - clickBounds && worldX < h.posX - clickBounds + clickSize &&
        worldY >= h.posY - clickBounds && worldY < h.posY - clickBounds + clickSize) {
      return i;
    }
  }
  return -1;
}

// Find a platform whose cell contains the world position
function sandboxFindPlatformAtWorld(worldX, worldY) {
  for (var i = 0; i < sandbox.platforms.length; i++) {
    var p = sandbox.platforms[i];
    if (worldX >= p.x && worldX < p.x + p.width &&
        worldY >= p.y && worldY < p.y + p.height) {
      return i;
    }
  }
  return -1;
}


// Sandbox-only star overlap: enforces the 128×128 click-area rule but NOT
// the "stars can't share a vertical column" rule used by the endless game mode.
function sandboxStarOverlaps(posX, posY) {
  var clickSize = 128;
  for (var i = 0; i < starHooks.length; i++) {
    var dx = Math.abs(posX - starHooks[i].posX);
    var dy = Math.abs(posY - starHooks[i].posY);
    if (dx < clickSize && dy < clickSize) return true;
  }
  return false;
}

// Check if a candidate shooting star region (col, row, span) overlaps any
// existing star exclusion zone (128×128) or other shooting star region.
function sandboxShootingOverlaps(col, row, span) {
  var sq = gridSize.square;
  var regionSize = (span || 8) * sq;
  var rL = gridBaseX + col * sq;
  var rR = rL + regionSize;
  var rT = row * sq;
  var rB = rT + regionSize;

  // Check against regular star exclusion zones (128×128)
  var clickBounds = 32, clickSize = 128;
  for (var i = 0; i < starHooks.length; i++) {
    var h = starHooks[i];
    var sL = h.posX - clickBounds, sR = sL + clickSize;
    var sT = h.posY - clickBounds, sB = sT + clickSize;
    if (rL < sR && rR > sL && rT < sB && rB > sT) return true;
  }

  // Check against existing shooting star regions
  if (typeof shootingStarHooks !== 'undefined') {
    for (var i = 0; i < shootingStarHooks.length; i++) {
      var ss = shootingStarHooks[i];
      if (rL < ss.originX + ss.regionSize && rR > ss.originX &&
          rT < ss.originY + ss.regionSize && rB > ss.originY) return true;
    }
  }

  return false;
}


// Rebuild the elements array after a splice on starHooks
// Shooting star hooks use their static region bounds; regular hooks use 32px bounds.
function sandboxRebuildElements() {
  elements = [];
  for (var i = 0; i < starHooks.length; i++) {
    starHooks[i].star.index = i;
    var ssMeta = null;
    if (typeof shootingStarHooks !== 'undefined') {
      for (var j = 0; j < shootingStarHooks.length; j++) {
        if (shootingStarHooks[j].hook === starHooks[i]) { ssMeta = shootingStarHooks[j]; break; }
      }
    }
    if (ssMeta) {
      elements.push({ posX: ssMeta.originX + 1, posY: ssMeta.originY + 1, size: ssMeta.regionSize - 2, index: i, chunkIndex: -1 });
    } else {
      var clickyBounds = 32;
      elements.push({ posX: starHooks[i].posX - clickyBounds, posY: starHooks[i].posY - clickyBounds, size: 64 + (clickyBounds * 2), index: i, chunkIndex: -1 });
    }
  }
}


function sandboxPlaceHook(mouseX, mouseY) {
  var gpx = camera.x * parallax.gamePanel;
  var gpy = camera.y * parallax.gamePanel;
  var worldX = mouseX - gpx;
  var worldY = mouseY - gpy;

  var col, row;
  if (sandbox.snapToGrid) {
    col = Math.round((worldX - gridBaseX) / gridSize.square);
    row = Math.round(worldY / gridSize.square);
  } else {
    col = (worldX - gridBaseX) / gridSize.square;
    row = worldY / gridSize.square;
  }

  // Cursor is the center of the star (64×64), so offset by -1 cell so
  // the star's center lands on the snap point rather than its top-left corner.
  col = col - 1;
  row = row - 1;

  // Check for overlaps with existing stars or shooting star regions.
  // Sandbox only enforces the 128×128 click-area rule — unlike the endless
  // game mode, sandbox allows stars to share vertical columns.
  var pos = gridPosAt(col, row);
  if (sandboxStarOverlaps(pos.positionX, pos.positionY)) return;
  // Block if star's exclusion zone intersects any shooting star region
  if (typeof shootingStarHooks !== 'undefined') {
    var cb = 32, cs = 128;
    var sL = pos.positionX - cb, sR = sL + cs;
    var sT = pos.positionY - cb, sB = sT + cs;
    for (var i = 0; i < shootingStarHooks.length; i++) {
      var ss = shootingStarHooks[i];
      if (sL < ss.originX + ss.regionSize && sR > ss.originX &&
          sT < ss.originY + ss.regionSize && sB > ss.originY) return;
    }
  }

  var isImmune = (sandbox.tool === 'immune');
  var hookIndex = starHooks.length;
  createHook(col, row, isImmune, -1);
  drawClicky();

  sandbox.hooks.push(hookIndex);
  sandbox.redoStack = [];
  sandbox.placedItems.push({ type: 'star', index: hookIndex });
  sandboxAutoSave();
}


// ─── Export / Import ───────────────────────────────────────────────────────────

function sandboxExportLevel() {
  var hooks = [];
  // Skip shooting star hooks — they're saved separately
  var shootingHookIndices = {};
  if (typeof shootingStarHooks !== 'undefined') {
    for (var i = 0; i < shootingStarHooks.length; i++) {
      shootingHookIndices[shootingStarHooks[i].hook.star.index] = true;
    }
  }
  for (var i = 0; i < starHooks.length; i++) {
    if (shootingHookIndices[starHooks[i].star.index]) continue;
    var h = starHooks[i];
    hooks.push({
      col:    Math.round((h.posX - gridBaseX) / gridSize.square),
      row:    Math.round(h.posY / gridSize.square),
      immune: !!h.star.immune
    });
  }

  // Platforms — exclude floor tiles
  var plats = [];
  for (var i = 0; i < sandbox.platforms.length; i++) {
    var p = sandbox.platforms[i];
    if (!p.isFloor) plats.push({ col: p.col, row: p.row });
  }

  // Shooting stars
  var shooting = [];
  if (typeof shootingStarHooks !== 'undefined') {
    for (var i = 0; i < shootingStarHooks.length; i++) {
      var ss = shootingStarHooks[i];
      shooting.push({ col: ss.col, row: ss.row, span: ss.span });
    }
  }

  return {
    gridSize: gridSize.square,
    gridBaseX: gridBaseX,
    hooks: hooks,
    platforms: plats,
    shooting: shooting,
    clouds: sandbox.clouds.slice(), // painted cloud blobs
    settings: {
      tool:          sandbox.tool,
      showBounds:    sandbox.showBounds,
      showClickAreas: sandbox.showClickAreas,
      snapToGrid:    sandbox.snapToGrid,
      cameraFollow:  sandbox.cameraFollow,
      gravity:       (typeof debugGravityEnabled !== 'undefined') ? debugGravityEnabled : true
    }
  };
}


function sandboxAutoSave() {
  try {
    var data = sandboxExportLevel();
    localStorage.setItem('aibek-sandbox-level', JSON.stringify(data));
  } catch (e) {}
}


function sandboxImportLevel(data) {
  sandboxReset(true); // skip snapshot — import is not itself undoable

  if (data.gridBaseX !== undefined) gridBaseX = data.gridBaseX;

  if (data.hooks) {
    for (var i = 0; i < data.hooks.length; i++) {
      var h = data.hooks[i];
      var hookIndex = starHooks.length;
      createHook(h.col, h.row, true, -1);
      if (h.immune) { starHooks[hookIndex].star.immune = true; drawHook(starHooks[hookIndex]); }
      sandbox.hooks.push(hookIndex);
      sandbox.placedItems.push({ type: 'star', index: hookIndex });
    }
    drawClicky();
  }

  if (data.platforms) {
    for (var i = 0; i < data.platforms.length; i++) {
      var p = data.platforms[i];
      sandboxCreatePlatform(p.col, p.row);
    }
  }

  if (data.shooting) {
    for (var i = 0; i < data.shooting.length; i++) {
      var ss = data.shooting[i];
      var newSS = createShootingStar(ss.col, ss.row, ss.span || 8);
      sandbox.placedItems.push({ type: 'shooting', ref: newSS });
    }
    drawClicky();
  }

  if (data.clouds) {
    sandbox.clouds = data.clouds.slice();
  }

  if (data.characterX !== undefined) character.centerX = data.characterX;
  if (data.characterY !== undefined) character.centerY = data.characterY;
}
