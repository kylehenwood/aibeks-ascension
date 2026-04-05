// Parallax control panel — right side, toggled with 'P' key
// Shows all depth layers sorted by depth with visual z-map

function createParallaxPanel() {
  var panel = document.createElement('div');
  panel.id = 'parallax-panel';

  var layers = [
    { key: 'bgStars1',  label: 'BG Stars 1',   color: '#334', min: 0, max: 2, step: 0.01 },
    { key: 'bgStars2',  label: 'BG Stars 2',   color: '#446', min: 0, max: 2, step: 0.01 },
    { key: 'bgStars3',  label: 'BG Stars 3',   color: '#558', min: 0, max: 2, step: 0.01 },
    { key: 'bgStars4',  label: 'BG Stars 4',   color: '#66a', min: 0, max: 2, step: 0.01 },
    { key: 'bgStars5',  label: 'BG Stars 5',   color: '#88c', min: 0, max: 2, step: 0.01 },
    { key: 'twinkle',   label: 'Twinkle',      color: '#669', min: 0, max: 2, step: 0.01 },
    { key: 'gamePanel', label: 'Stars+Char',   color: '#fff', min: 0, max: 2, step: 0.01 },
    { key: 'cloud1',    label: 'Cloud BG',     color: '#8cf', min: 0, max: 3, step: 0.01 },
    { key: 'cloud2',    label: 'Cloud SM',     color: '#adf', min: 0, max: 3, step: 0.01 },
    { key: 'cloud3',    label: 'Cloud FG',     color: '#cef', min: 0, max: 3, step: 0.01 },
    { key: 'platform',  label: 'Platform',     color: '#fa0', min: 0, max: 3, step: 0.01 }
  ];

  var html = '<div class="pp-header"><span>PARALLAX MAP</span><span>[P] toggle</span></div>';
  html += '<div class="pp-body">';

  // Z-map visualization
  html += '<div class="pp-zmap" id="pp-zmap"></div>';
  html += '<div class="pp-divider"></div>';

  // Sliders
  for (var i = 0; i < layers.length; i++) {
    var l = layers[i];
    html += '<div class="pp-row">' +
      '<span class="pp-dot" style="background:' + l.color + '"></span>' +
      '<span class="pp-label">' + l.label + '</span>' +
      '<input type="range" id="pp-' + l.key + '" min="' + l.min + '" max="' + l.max + '" step="' + l.step + '">' +
      '<span class="pp-val" id="pp-' + l.key + '-val"></span>' +
    '</div>';
  }

  html += '</div>';
  panel.innerHTML = html;
  document.body.appendChild(panel);

  // Add z-map styles
  var style = document.createElement('style');
  style.textContent =
    '.pp-zmap { position: relative; height: 140px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; background: #0a0a14; }' +
    '.pp-zmap-line { position: absolute; left: 0; right: 0; height: 1px; pointer-events: none; }' +
    '.pp-zmap-label { position: absolute; right: 4px; font-size: 8px; transform: translateY(-50%); white-space: nowrap; pointer-events: none; }' +
    '.pp-zmap-baseline { position: absolute; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.3); pointer-events: none; }' +
    '.pp-zmap-baseline-label { position: absolute; left: 4px; font-size: 8px; color: rgba(255,255,255,0.5); transform: translateY(-12px); }' +
    '.pp-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }' +
    '.pp-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0 8px; }';
  document.head.appendChild(style);

  // Wire sliders
  for (var i = 0; i < layers.length; i++) {
    (function(l) {
      var slider = document.getElementById('pp-' + l.key);
      var val = document.getElementById('pp-' + l.key + '-val');

      slider.value = parallax[l.key];
      val.textContent = parallax[l.key].toFixed(2);

      slider.addEventListener('input', function() {
        parallax[l.key] = parseFloat(this.value);
        val.textContent = parseFloat(this.value).toFixed(2);
        updateZMap();
      });
    })(layers[i]);
  }

  function updateZMap() {
    var zmap = document.getElementById('pp-zmap');
    var maxVal = 0;
    for (var i = 0; i < layers.length; i++) {
      if (parallax[layers[i].key] > maxVal) maxVal = parallax[layers[i].key];
    }
    maxVal = Math.max(maxVal, 2) * 1.1; // add padding

    var h = '';

    // Baseline at 1.0 (camera)
    var baseY = (1 - 1.0 / maxVal) * 100;
    h += '<div class="pp-zmap-baseline" style="top:' + baseY + '%"></div>';
    h += '<div class="pp-zmap-baseline-label" style="top:' + baseY + '%">1.0 camera</div>';

    // Behind zone label
    h += '<div style="position:absolute;left:4px;top:4px;font-size:7px;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1px;">behind</div>';
    // Front zone label
    h += '<div style="position:absolute;left:4px;bottom:4px;font-size:7px;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1px;">in front</div>';

    // Sort layers by value for clean display
    var sorted = layers.slice().sort(function(a, b) { return parallax[a.key] - parallax[b.key]; });

    for (var i = 0; i < sorted.length; i++) {
      var l = sorted[i];
      var val = parallax[l.key];
      var y = (1 - val / maxVal) * 100;
      h += '<div class="pp-zmap-line" style="top:' + y + '%;background:' + l.color + ';opacity:0.7;"></div>';
      h += '<div class="pp-zmap-label" style="top:' + y + '%;color:' + l.color + '">' + l.label + ' ' + val.toFixed(2) + '</div>';
    }

    zmap.innerHTML = h;
  }

  updateZMap();

  // Toggle with P key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'p' || e.key === 'P') {
      var vis = panel.style.display === 'none' ? 'block' : 'none';
      panel.style.display = vis;
      e.preventDefault();
    }
  });
}
