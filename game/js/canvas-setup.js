// Canvas setup — shared between game and sandbox pages
function setupCanvas() {
    // need to recall this on resize
    canvas.id = document.getElementById('js-starswinger');
    canvas.context = canvas.id.getContext("2d");

    // Camera height is always 640; width adjusts to fill the screen aspect ratio
    var aspect = window.innerWidth / window.innerHeight;
    camera.width = Math.round(640 * aspect);
    camera.height = 640;

    // Logical canvas is larger than camera for dev space
    canvas.width = camera.width * 2;
    canvas.height = camera.height * 2;

    // Physical canvas is scaled up for crisp rendering
    canvas.id.setAttribute('width', canvas.width * renderScale);
    canvas.id.setAttribute('height', canvas.height * renderScale);

    // Camera offset — centers the gameplay region within the logical canvas
    camera.offsetX = (canvas.width - camera.width) / 2;
    camera.offsetY = (canvas.height - camera.height) / 2;
}
