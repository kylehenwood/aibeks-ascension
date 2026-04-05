// Parallax control panel — right side, toggled with 'P' key
// Visual map of all depth layers with sliders

function createParallaxPanel() {
  var panel = document.createElement('div');
  panel.id = 'parallax-panel';

  var layers = [
    { key: 'bgStars1',  label: 'BG Stars 1',  min: 0,   max: 1,   step: 0.01 },
    { key: 'bgStars2',  label: 'BG Stars 2',  min: 0,   max: 1,   step: 0.01 },
    { key: 'bgStars3',  label: 'BG Stars 3',  min: 0,   max: 1,   step: 0.01 },
    { key: 'bgStars4',  label: 'BG Stars 4',  min: 0,   max: 1,   step: 0.01 },
    { key: 'bgStars5',  label: 'BG Stars 5',  min: 0,   max: 1,   step: 0.01 },
    { key: 'twinkle',   label: 'Twinkle',     min: 0,   max: 1,   step: 0.01 },
    { key: 'gamePanel', label: 'Grapple Stars',min: 0.5, max: 1.5, step: 0.01 },
    { key: 'cloud1',    label: 'Cloud 1',     min: 1.0, max: 2.5, step: 0.01 },
    { key: 'cloud2',    label: 'Cloud 2',     min: 1.0, max: 2.5, step: 0.01 },
    { key: 'cloud3',    label: 'Cloud 3',     min: 1.0, max: 2.5, step: 0.01 },
    { key: 'platform',  label: 'Platform',    min: 1.0, max: 3.0, step: 0.01 }
  ];

  var html = '<div class="pp-header"><span>Parallax Map</span><span>P to toggle</span></div>';
  html += '<div class="pp-body">';

  for (var i = 0; i < layers.length; i++) {
    var l = layers[i];
    html += '<div class="pp-row">' +
      '<span class="pp-label">' + l.label + '</span>' +
      '<input type="range" id="pp-' + l.key + '" min="' + l.min + '" max="' + l.max + '" step="' + l.step + '">' +
      '<span class="pp-val" id="pp-' + l.key + '-val"></span>' +
    '</div>' +
    '<div class="pp-bar"><div class="pp-bar-fill" id="pp-' + l.key + '-bar"></div></div>';
  }

  html += '</div>';
  panel.innerHTML = html;
  document.body.appendChild(panel);

  // Wire sliders
  for (var i = 0; i < layers.length; i++) {
    (function(l) {
      var slider = document.getElementById('pp-' + l.key);
      var val = document.getElementById('pp-' + l.key + '-val');
      var bar = document.getElementById('pp-' + l.key + '-bar');

      slider.value = parallax[l.key];
      val.textContent = parallax[l.key];
      bar.style.width = ((parallax[l.key] - l.min) / (l.max - l.min) * 100) + '%';

      slider.addEventListener('input', function() {
        parallax[l.key] = parseFloat(this.value);
        val.textContent = this.value;
        bar.style.width = ((parallax[l.key] - l.min) / (l.max - l.min) * 100) + '%';
      });
    })(layers[i]);
  }

  // Toggle with P key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'p' || e.key === 'P') {
      var vis = panel.style.display === 'none' ? 'block' : 'none';
      panel.style.display = vis;
      e.preventDefault();
    }
  });
}
