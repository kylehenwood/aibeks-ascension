// load all assets, once loaded start the game / intro.

var gameLoading = {
  canvas: null,
  context: null,
  progress: 0,
  loadTime: 1000,
  splashImg: null,
  splashReady: false
}

function setupLoading() {
  gameState = 'loading';

  setTimeout(function(){
    setupIntro();
  },gameLoading.loadTime);

  gameLoading.canvas = document.createElement('canvas');
  gameLoading.canvas.width = camera.width;
  gameLoading.canvas.height = camera.height;
  gameLoading.context = gameLoading.canvas.getContext('2d');

  // load splash art
  gameLoading.splashImg = new Image();
  gameLoading.splashImg.onload = function() {
    gameLoading.splashReady = true;
  };
  gameLoading.splashImg.src = 'art/splashart.jpg';

}

// faux loading bar currently
function updateLoading(context) {
  context.clearRect(0, 0, camera.width, camera.height);

  // dark background
  context.beginPath();
  context.rect(0,0,camera.width,camera.height);
  context.fillStyle = '#0a0a12';
  context.fill();
  context.closePath();

  // splash art - cover fit to canvas
  if (gameLoading.splashReady) {
    var img = gameLoading.splashImg;
    var imgRatio = img.naturalWidth / img.naturalHeight;
    var canvasRatio = camera.width / camera.height;
    var drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawW = camera.width;
      drawH = camera.width / imgRatio;
    } else {
      drawH = camera.height;
      drawW = camera.height * imgRatio;
    }
    drawX = (camera.width - drawW) / 2;
    drawY = (camera.height - drawH) / 2;

    context.drawImage(img, drawX, drawY, drawW, drawH);
  }

  // faux loading bar
  var barWidth = 200;
  var barStart = (camera.width / 2) - (barWidth / 2);
  var barY = camera.height - 40;

  if(gameLoading.progress < 100) {
    gameLoading.progress += 2;
  }

  // bar track
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.fillRect(barStart, barY, barWidth, 3);

  // bar fill
  var fillWidth = barWidth * (gameLoading.progress / 100);
  context.fillStyle = 'white';
  context.fillRect(barStart, barY, fillWidth, 3);
}
