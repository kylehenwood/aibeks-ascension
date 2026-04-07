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
