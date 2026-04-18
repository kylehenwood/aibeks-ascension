// Tab Navigation — simple links between Game and Sandbox pages

function createTabNavigation(activePage) {
  var nav = document.createElement('div');
  nav.id = 'tab-navigation';
  nav.className = 'tab-nav';

  var gameClass    = 'tab-nav__tab' + (activePage === 'game'    ? ' tab-nav__tab--active' : '');
  var sandboxClass = 'tab-nav__tab' + (activePage === 'sandbox' ? ' tab-nav__tab--active' : '');

  var gameHref    = activePage === 'game'    ? '#' : 'game.html';
  var sandboxHref = activePage === 'sandbox' ? '#' : 'sandbox.html';

  nav.innerHTML =
    '<a class="' + gameClass + '" href="' + gameHref + '">Game</a>' +
    '<a class="' + sandboxClass + '" href="' + sandboxHref + '">Sandbox</a>' +
    '<a class="tab-nav__tab" href="/" target="_blank" rel="noopener">Website</a>';

  document.body.insertBefore(nav, document.body.firstChild);
}
