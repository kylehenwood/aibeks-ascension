function drawStarChargeBar(context) {
  var barWidth = 120;
  var barHeight = 8;
  var barX = (camera.width / 2) - (barWidth / 2);
  var barY = camera.height - 32;

  var percent = starCharge.power / starCharge.maxPower;

  // Track background
  context.fillStyle = 'rgba(0,0,0,0.4)';
  context.fillRect(barX, barY, barWidth, barHeight);

  // Fill
  if (starCharge.charged) {
    context.fillStyle = 'cyan';
  } else {
    context.fillStyle = 'rgba(255,255,255,0.6)';
  }
  context.fillRect(barX + 1, barY + 1, (barWidth - 2) * percent, barHeight - 2);
}

function updateMoonPowerBar() {

  var context = canvas.context;

  // next immune star
  var barGutter = 160;
  var barWidth = camera.width-(barGutter*2);
  var barHeight = 24;

  // background
  context.fillStyle = 'rgba(0,0,0,0.8)';
  context.fillRect(barGutter,camera.height-64,barWidth,barHeight)

  var maxPower = debugImmunityThreshold;

  if(starImmunity.power > maxPower) {
    starImmunity.power = maxPower;
    starImmunity.immune = debugImmunityEnabled;
    context.fillStyle = 'cyan';
  } else {
    context.fillStyle = 'white';
  }

  var percent = starImmunity.power/maxPower;
  var powerWidth = (barWidth-8)*percent;

  context.fillRect(barGutter+4,camera.height-60,powerWidth,barHeight-8)
}
