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
