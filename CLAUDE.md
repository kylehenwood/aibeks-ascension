# Aibek's Ascension — Developer Notes

## Star Types & Design Language

All stars share the same visual structure (center dot + faint static ring + bold progress border).
Color signals type:

| Type | Color | Behavior |
|------|-------|----------|
| Standard | Green (`#40e070`) | Decays while connected (ring depletes) |
| Immune | Cyan (`#40e0ff`) | Reveals border on connect but never depletes |
| Shooting | Yellow (`#ffc800`) | Drains in power as it animates across its region and fades out |
| Ratchet | Red | Faster/punitive decay variant (currently unused in sandbox) |

### Shooting Star Mechanic

The shooting star drains its power as it animates/fades out:

- Travels diagonally across a grid region (default 8×8 cells)
- Its progress arc (yellow) sweeps from full to empty as it crosses the region — that's its "power draining"
- When progress reaches 1 (end of path), it detaches the player and respawns at the start
- The head/trail fade out visually as progress increases
- Speed: 0.004 progress per frame (~250 frames to cross at 60fps)

Player must time their grapple — connecting late means less swing time before it respawns and throws them off.

## Sandbox Coordinate System

- **World space**: `gridBaseX + col * sq` — where stars/platforms live. Rendered through `gameContext.translate(camera.x, camera.y)`.
- **Cloud-layer space**: painted clouds are stored in cloud-layer coordinates (screen X, camera-invariant Y). Rendered on `canvas.context` with `y + camera.y * cloudParallax`.
- **Screen space**: mouse coords after `screenToCamera()` — equals world + camera offset.

## Key Sandbox Files

- `sandbox.js` — state, click handlers, placement logic, cloud painter, export/import
- `sandbox-ui.js` — toolbar pills, mode toggle, camera toggle, sidebar panel
- `sandbox-init.js` — page entry point for sandbox.html
- `hookDraw.js` — shared star rendering (color = type signal)
- `shooting-star.js` — shooting star movement + hook canvas overlay

## LocalStorage Keys

- `aibek-sandbox-level` — level data + user settings (tool, bounds toggles, camera mode, etc.)
- `ss_bgShootingStars` — background decorative shooting star toggle

## Mode Semantics

- **Play mode**: physics runs, tools hidden/disabled, clicks grapple. Camera always starts in Follow. Drag does not free the camera.
- **Build mode**: physics paused, tools active. Drag pans the camera and switches to Free mode.
