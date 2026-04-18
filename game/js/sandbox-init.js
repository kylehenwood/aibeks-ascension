// Sandbox initialization — dedicated entry point for sandbox.html
(function() {

  // Use devicePixelRatio for renderScale so 1 game unit = 1 CSS pixel.
  renderScale = window.devicePixelRatio || 1;

  // Add scaled-mode to body. The scaled-mode CSS sets:
  //   .layout__container { position: fixed; top:0; left:0; 100vw×100vh; transform:none }
  // This removes the transform:translateY(-50%) that would otherwise make
  // .layout__container a containing block for position:fixed descendants.
  document.body.classList.add('scaled-mode');

  // Set up canvas to fill the window at 1:1 CSS pixels
  setupSandboxCanvas();
  setupGameCanvas();
  setupCharacter();

  // Resize: rebuild canvas and dependent sub-canvases
  // Do NOT call resizeCamera — it doubles canvas.width for the game's dev border
  window.addEventListener('resize', function() {
    setupSandboxCanvas();
    gamePanel.canvas.width = camera.width;
    gamePanel.canvas.height = camera.height;
    gamePanel.context = gamePanel.canvas.getContext('2d');
    drawClicky();
    if (typeof galaxyMaskCanvas !== 'undefined') {
      galaxyMaskCanvas.width = camera.width;
      galaxyMaskCanvas.height = camera.height;
      galaxyMaskCanvas.context = galaxyMaskCanvas.getContext('2d');
    }
    if (typeof setMouseVariables === 'function') setMouseVariables();
  });

  // Input
  controls();
  mouseTestSetup();

  // Sub canvases needed by the engine
  setupBackground();
  setupForeground();

  // UI
  soundToggle();
  createTabNavigation('sandbox');
  var hud = document.createElement('div');
  hud.id = 'sandbox-hud';
  hud.className = 'sandbox-hud';
  document.body.appendChild(hud);
  createSandboxModeToggle();
  createSandboxToolbar();
  createSandboxViewToolbar();
  createSandboxCameraToggle();
  createSandboxPanel();
  sandboxSetupKeys();

  // Initialize sandbox mode directly
  sandboxInit();

  // Sync all UI to reflect loaded settings
  if (typeof sandboxSyncAllUI === 'function') sandboxSyncAllUI();

  // Start the RAF loop
  runGame();

}());


// Canvas setup for sandbox — 1 game unit = 1 CSS pixel.
// The canvas stays in its normal DOM position inside .layout__container.
// scaled-mode CSS ensures the container is position:fixed with transform:none,
// so the canvas sits correctly within a true viewport-filling container.
function setupSandboxCanvas() {
  canvas.id = document.getElementById('js-starswinger');
  canvas.context = canvas.id.getContext("2d");

  // Camera = full window in CSS pixels
  camera.width  = window.innerWidth;
  camera.height = window.innerHeight;

  // Logical canvas = camera (no 2x dev-border that the normal game uses)
  canvas.width  = camera.width;
  canvas.height = camera.height;

  // Physical canvas = renderScale × logical (for HiDPI crispness)
  canvas.id.setAttribute('width',  canvas.width  * renderScale);
  canvas.id.setAttribute('height', canvas.height * renderScale);

  // CSS: explicit pixel size — no browser scaling
  canvas.id.style.width    = camera.width  + 'px';
  canvas.id.style.height   = camera.height + 'px';
  canvas.id.style.objectFit = 'none';
  canvas.id.style.display  = 'block';

  // No position:fixed on the canvas — let the container handle layout
  canvas.id.style.position = '';
  canvas.id.style.top      = '';
  canvas.id.style.left     = '';

  // No offset — camera region is the entire canvas
  camera.offsetX = 0;
  camera.offsetY = 0;
}
