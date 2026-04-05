// Progressively draw line from character to hook
// this is controlled by the game RAF engine, and the variable hookGrappel.launch
function grappelLaunch(context) {

  var increment = 0;
  //console.log('grappel launch!');

 if (increment < 1) {
   var t = (hookGrappel.currentIteration/hookGrappel.interations);
   increment = Math.pow(Math.min(t, 1), physics.GRAPPLE_EASE);
   hookGrappel.currentIteration += 1*dt;
 }

 // regular sized triangle
 var triWidth = selectedHook.centerX-character.centerX;
 var triHeight = selectedHook.centerY-character.centerY;
 var triHypo = Math.hypot(triWidth,triHeight);
 var triAngle = Math.acos(triHeight/triHypo);

 // create small triangle by shrinking the hypotenuse
 // gameOverMoveSpeed = (-canvas.height-cameraY)/10;
 var smallHypo = triHypo*increment;
 var smallWidth = Math.sin(triAngle)*smallHypo;
 var smallHeight = Math.cos(triAngle)*smallHypo;

 // calculate positions for rope based on small triangle
 var ropeStartX = character.centerX;
 var ropeStartY = character.centerY;

 // if the character is on the right side of hook... else
 var ropeEndX = null;
 if (character.centerX > selectedHook.centerX) {
   ropeEndX = character.centerX-smallWidth;
 } else {
   ropeEndX = character.centerX+smallWidth;
 }
 var ropeEndY = character.centerY+smallHeight;

  // Draw line
  //-------------------------
  context.beginPath();
  context.lineWidth = 2;
  context.moveTo(character.centerX,character.centerY);
  context.lineTo(ropeEndX,ropeEndY);
  context.strokeStyle = 'red';
  context.stroke();
  context.closePath();

  if (testingBool === true) {
    //small triangle
    context.strokeStyle = 'gold';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(ropeStartX,ropeStartY);  // startPointX, startPointY
    context.lineTo(ropeEndX,ropeStartY); // HookX,HookY
    context.lineTo(ropeEndX,ropeEndY); // startPointY, HookX
    context.closePath();    // hypotinuse
    context.stroke();
  }
}

// fade last
function grappelDissipate() {
  // fade out previous grappel rope WITH PARTICLES
}
