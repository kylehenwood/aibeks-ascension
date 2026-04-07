// Surface collision system
// Surfaces are registered with world-space bounds and a parallax factor.
// Collision is resolved in screen space each frame.

var surfaces = [];

// Register a surface for collision detection
// Returns the surface object so it can be updated or removed
function addSurface(opts) {
  var surface = {
    // World-space position and size (updated externally each frame)
    x: opts.x || 0,
    y: opts.y || 0,
    width: opts.width || 0,
    height: opts.height || 0,
    // Parallax factor — determines how this surface moves with camera
    parallax: opts.parallax || 1.0,
    // Only collide with the top edge (platform behaviour)
    topOnly: opts.topOnly !== undefined ? opts.topOnly : true,
    // Active flag — skip collision when false
    active: opts.active !== undefined ? opts.active : true,
    // Optional tag for identification
    tag: opts.tag || null
  };
  surfaces.push(surface);
  return surface;
}

function removeSurface(surface) {
  var idx = surfaces.indexOf(surface);
  if (idx !== -1) surfaces.splice(idx, 1);
}

function removeAllSurfaces() {
  surfaces.length = 0;
}

// Check and resolve collisions between the character and all active surfaces.
// Called each frame when the character is falling (not swinging).
function checkSurfaceCollisions() {
  if (character.swinging) return;

  var charRadius = character.size / 2;
  // Character screen position (game panel parallax is 1.0)
  var charScreenX = character.centerX + camera.x;
  var charScreenY = character.centerY + camera.y;
  var charBottom = charScreenY + charRadius;
  var charLeft = charScreenX - charRadius;
  var charRight = charScreenX + charRadius;

  for (var i = 0; i < surfaces.length; i++) {
    var s = surfaces[i];
    if (!s.active) continue;

    // Surface screen position
    var surfScreenX = s.x + camera.x * s.parallax;
    var surfScreenY = s.y + camera.y * s.parallax;
    var surfRight = surfScreenX + s.width;
    var surfBottom = surfScreenY + s.height;

    // Horizontal overlap check
    if (charRight <= surfScreenX || charLeft >= surfRight) continue;

    if (s.topOnly) {
      // Only collide when falling onto the top edge
      if (physics.vy <= 0) continue;
      // Character must be approaching from above — bottom was above surface top last frame
      var prevBottom = charBottom - physics.vy * dt;
      if (prevBottom > surfScreenY) continue;
      if (charBottom < surfScreenY) continue;

      // Land on surface
      // Convert surface screen Y back to character world Y
      character.centerY = surfScreenY - charRadius - camera.y;
      physics.vy = 0;
    } else {
      // Full AABB collision (for future use — walls, ceilings, etc.)
      var charTop = charScreenY - charRadius;
      if (charBottom <= surfScreenY || charTop >= surfBottom) continue;

      // Resolve by pushing out the shortest axis
      var overlapTop = charBottom - surfScreenY;
      var overlapBottom = surfBottom - charTop;
      var overlapLeft = charRight - surfScreenX;
      var overlapRight = surfRight - charLeft;
      var minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

      if (minOverlap === overlapTop && physics.vy > 0) {
        character.centerY = surfScreenY - charRadius - camera.y;
        physics.vy = 0;
      } else if (minOverlap === overlapBottom && physics.vy < 0) {
        character.centerY = surfBottom + charRadius - camera.y;
        physics.vy = 0;
      } else if (minOverlap === overlapLeft && physics.vx > 0) {
        character.centerX = surfScreenX - charRadius - camera.x;
        physics.vx = 0;
      } else if (minOverlap === overlapRight && physics.vx < 0) {
        character.centerX = surfRight + charRadius - camera.x;
        physics.vx = 0;
      }
    }
  }
}
