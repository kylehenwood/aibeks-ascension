// Chunk-based world generation
// Divides the infinite world into fixed-width chunks that are generated
// deterministically from a seed. Chunks load/unload as the camera moves,
// keeping memory bounded while allowing bidirectional travel.

// Seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Seeded rand — inclusive integer range, mirrors the global rand() behavior
function seededRand(rng, min, max) {
  return Math.ceil(rng() * (max - min) + min);
}

var chunkManager = {
  baseSeed: 0,
  CHUNK_COLS: 60,        // columns per chunk (60 * 32px = 1920px)
  BUFFER: 2,             // chunks to keep loaded on each side
  EDGE_BUFFER: 4,        // star-free columns at each chunk edge to prevent cross-chunk overlap
  loadedChunks: {},       // chunkIndex -> { generated: true }
  lastCenterChunk: null,  // last chunk index the camera was centered on

  // Get the chunk index for a world X position
  getChunkIndex: function(worldX) {
    var chunkWidth = this.CHUNK_COLS * gridSize.square;
    return Math.floor((worldX - gridBaseX) / chunkWidth);
  },

  // Reset all chunk state (on game start / restart)
  reset: function() {
    this.baseSeed = Math.floor(Math.random() * 2147483647);
    this.loadedChunks = {};
    this.lastCenterChunk = null;
    starHooks = [];
    elements = [];
  },

  // Called every frame during gameplay — loads/unloads chunks around camera
  ensureChunks: function(cameraX) {
    // Don't load/unload during transitions — stars are pre-placed
    if (gameState === 'starting' || gameState === 'gameRestart') return;
    this._ensureChunksAt(cameraX);
  },

  _ensureChunksAt: function(cameraX) {
    var centerWorldX = -cameraX + camera.width / 2;
    var centerChunk = this.getChunkIndex(centerWorldX);

    // Skip if camera hasn't moved to a new chunk
    if (centerChunk === this.lastCenterChunk) return;
    this.lastCenterChunk = centerChunk;

    var minChunk = centerChunk - this.BUFFER;
    var maxChunk = centerChunk + this.BUFFER;

    // Unload chunks outside range
    var loaded = Object.keys(this.loadedChunks);
    for (var i = 0; i < loaded.length; i++) {
      var idx = parseInt(loaded[i]);
      if (idx < minChunk || idx > maxChunk) {
        this.unloadChunk(idx);
      }
    }

    // Load chunks in outward order from center (so adjacent chunks exist for overlap checks)
    this.loadIfNeeded(centerChunk);
    for (var d = 1; d <= this.BUFFER; d++) {
      this.loadIfNeeded(centerChunk + d);
      this.loadIfNeeded(centerChunk - d);
    }
  },

  loadIfNeeded: function(chunkIndex) {
    if (this.loadedChunks[chunkIndex]) return;
    this.generateChunk(chunkIndex);
    this.loadedChunks[chunkIndex] = { generated: true };
    this.sortAndReindex();
    drawClicky();
  },

  // Generate stars for a single chunk deterministically
  generateChunk: function(chunkIndex) {
    var rng = mulberry32(this.baseSeed + chunkIndex * 31337);
    var chunkStartCol = chunkIndex * this.CHUNK_COLS;
    var chunkEndCol = chunkStartCol + this.CHUNK_COLS;

    // Star-free buffer at edges to prevent cross-chunk overlap
    var safeStart = chunkStartCol + this.EDGE_BUFFER;
    var safeEnd = chunkEndCol - this.EDGE_BUFFER;

    // Difficulty scales with distance from origin
    var baseDifficulty = Math.abs(chunkIndex);
    var minColGap = Math.min(5 + baseDifficulty, 10);
    var maxColGap = Math.min(7 + baseDifficulty, 14);

    // Walk columns within this chunk
    var col = safeStart;
    // First star in chunk 0 gets special treatment
    var isFirstEver = (chunkIndex === 0 && starHooks.length === 0);

    while (col < safeEnd) {
      col += seededRand(rng, minColGap, maxColGap);
      if (col >= safeEnd) break;

      var row;
      if (isFirstEver) {
        row = 1;
        isFirstEver = false;
      } else {
        // Try rows until we find one that doesn't overlap
        row = seededRand(rng, 0, gridSize.rows - 1);
        var placed = false;
        for (var attempt = 0; attempt < gridSize.rows; attempt++) {
          var testRow = (row + attempt) % gridSize.rows;
          var pos = gridPosAt(col, testRow);
          if (!starOverlaps(pos.positionX, pos.positionY)) {
            row = testRow;
            placed = true;
            break;
          }
        }
        if (!placed) continue; // skip this column if no valid row
      }

      var pos = gridPosAt(col, row);
      if (!starOverlaps(pos.positionX, pos.positionY)) {
        createHook(col, row, false, chunkIndex);
      }
    }
  },

  // Remove all stars belonging to a chunk
  unloadChunk: function(chunkIndex) {
    // Never unload the chunk containing the selected hook
    if (selectedHook && selectedHook.chunkIndex === chunkIndex) return;

    for (var i = starHooks.length - 1; i >= 0; i--) {
      if (starHooks[i].chunkIndex === chunkIndex) {
        starHooks.splice(i, 1);
        elements.splice(i, 1);
      }
    }
    delete this.loadedChunks[chunkIndex];
    this.sortAndReindex();
    drawClicky();
  },

  // Sort stars by posX and rebuild indices
  sortAndReindex: function() {
    starHooks.sort(function(a, b) { return a.posX - b.posX; });
    elements.sort(function(a, b) { return a.posX - b.posX; });
    for (var i = 0; i < starHooks.length; i++) {
      starHooks[i].star.index = i;
    }
    for (var i = 0; i < elements.length; i++) {
      elements[i].index = i;
    }
  }
};
