// Initialize Verlet rope between hook and character (fires on hook change).
// Momentum is preserved naturally — physics.vx/vy carry into the rope.
function repositionSwing() {
  if (selectedHook == null) return;
  physicsInitRope(
    selectedHook.centerX,
    selectedHook.centerY,
    character.centerX,
    character.centerY
  );
}
