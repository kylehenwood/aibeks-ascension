// Track whether a device preset is locking the aspect ratio
var deviceAspectLock = null; // null = use browser aspect, number = locked aspect ratio

function gameResizeSetup() {
  window.addEventListener('resize', function(event){
    gameResized();
  });
}

function gameResized() {
  var aspect = deviceAspectLock || (window.innerWidth / window.innerHeight);
  var newWidth = Math.round(640 * aspect);

  if (newWidth !== camera.width) {
    resizeCamera(newWidth, 640);
  }

  setMouseVariables();
}

// Map a screen pixel position to camera-space coordinates.
// Handles both object-fit: contain and cover modes.
function screenToCamera(clientX, clientY) {
  var el = canvas.id;
  var rect = el.getBoundingClientRect();
  var style = getComputedStyle(el);
  var fit = style.objectFit || 'contain';

  var scale;
  if (fit === 'cover') {
    scale = Math.max(rect.width / canvas.width, rect.height / canvas.height);
  } else {
    scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
  }

  // Rendered content size and crop offset (centered by default)
  var cropX = (canvas.width * scale - rect.width) / 2;
  var cropY = (canvas.height * scale - rect.height) / 2;

  return {
    x: (clientX - rect.left + cropX) / scale - camera.offsetX,
    y: (clientY - rect.top + cropY) / scale - camera.offsetY
  };
}
