// Stores animation information while progressing
let animateNumber;
let animateSetup = false;


// from, to, duration, easingMode
function animateNum(from,to,duration,easing){

  // setup
  if (animateSetup === false) {
    animateSetup = true;
    animateNumber = {
      progress: 0,
      increment: 0,
      animateAmount: 0,
      from: from,
      duration: duration,
      easing: easing,
      complete: false
    }

    // set variables
    animateNumber.amount = to-from; // amount to animate
    animateNumber.increment = 100/duration;

    // Testing output
    // console.log('increment:'+animateNumber.increment);
    // console.log('amount:'+animateNumber.amount);
    // console.log('easing:'+animateNumber.easing);
  }

  // increment animation progress from 0 to 1
  animateNumber.progress += animateNumber.increment*dt;

  // check if complete
  if (Math.round(animateNumber.progress) >= 100) {
    animateNumber.progress = 100;
    animateNumber.complete = true;
  }

  // animation easing types:: defaults to linear
  switch (animateNumber.easing) {
    case 'easeOutQuad':
      animation = EasingFunctions.easeOutQuint(animateNumber.progress/100);
      value = animateNumber.amount*animation;
      break;

    case 'easeInQuad':
      animation = EasingFunctions.easeInQuint(animateNumber.progress/100);
      value = animateNumber.amount*animation;
      break;

    case 'easeInOutQuad':
      animation = EasingFunctions.easeInOutQuad(animateNumber.progress/100);
      value = animateNumber.amount*animation;
      break;

    default:
      animation = EasingFunctions.linear(animateNumber.progress/100);
      value = animateNumber.amount*animation;
  };

  // add amount to move to original postion.
  value = value+animateNumber.from;
  //console.log(value);

  // variables to return
  var animationReturn = {
    value: value,
    complete: animateNumber.complete
  }

  // on complete
  if (animateNumber.complete === true) {
    console.log('animation-complete');
    animateSetup = false;
  }

  return animationReturn;

}





// handles the calculating of animation profress based on duration
function animationProgress(a,b) {
  var progress = 100/a;
  var value = b+progress;
  var complete = false;

  if (Math.round(value) >= 100) {
    value: 100,
    complete = true
  }
  return {
    value:value,
    complete:complete
  };
}



// Ease Out
function animateEaseOut(numWant,numHave,iterations) {
  var complete = false;
  var number;

  // when numWant is within 0.01 of numHave, end animation by setting number to 0 and firing a callback
  if (numWant-numHave > 2 && numWant-numHave < 2) {
    number = numWant;
    complete = true;
    console.log('animationComplete');
  } else {
    number = (numWant-numHave)/iterations;
    number = round2(number);
  }

  //console.log(number);
  //console.log(numHave+','+numWant+','+iterations);
  return number;
}


function round2(num) {
  num = num*100;
  num = Math.round(num);
  num = num/100;
  return num;
}



/*
 * Easing Functions - inspired from http://gizma.com/easing/
 * only considering the t value for the range [0, 1] => [0, 1]
 */
EasingFunctions = {
  // no easing, no acceleration
  linear: function (t) { return t },
  // accelerating from zero velocity
  easeInQuad: function (t) { return t*t },
  // decelerating to zero velocity
  easeOutQuad: function (t) { return t*(2-t) },
  // acceleration until halfway, then deceleration
  easeInOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
  // accelerating from zero velocity
  easeInCubic: function (t) { return t*t*t },
  // decelerating to zero velocity
  easeOutCubic: function (t) { return (--t)*t*t+1 },
  // acceleration until halfway, then deceleration
  easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
  // accelerating from zero velocity
  easeInQuart: function (t) { return t*t*t*t },
  // decelerating to zero velocity
  easeOutQuart: function (t) { return 1-(--t)*t*t*t },
  // acceleration until halfway, then deceleration
  easeInOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
  // accelerating from zero velocity
  easeInQuint: function (t) { return t*t*t*t*t },
  // decelerating to zero velocity
  easeOutQuint: function (t) { return 1+(--t)*t*t*t*t },
  // acceleration until halfway, then deceleration
  easeInOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }
}
