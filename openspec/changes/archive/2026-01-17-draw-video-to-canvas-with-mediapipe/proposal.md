# Change: Draw Video to Canvas with MediaPipe Gesture Drawing

## Why
Currently, the video element is displayed directly in the DOM, and the canvas (`#output-canvas`) only draws MediaPipe hand landmarks and connections. The user wants to draw the video content itself onto the canvas, and configure MediaPipe to draw recognized gestures on top of the video. This provides better control over rendering and allows for more flexible visual effects.

## What Changes
- **MODIFIED** `src/core/HandTracker.ts`: Update the `draw` method to draw video frames to canvas before drawing MediaPipe results, and enhance gesture drawing configuration.
- **MODIFIED** `src/main.ts`: Ensure video frames are continuously drawn to the canvas in the animation loop.
- **MODIFIED** `index.html`: Potentially hide or remove the direct video element display, as video will be drawn on canvas instead.
- **MODIFIED** `openspec/specs/ui/spec.md`: Update the Camera Background Output requirement to specify canvas-based rendering.

## Impact
- Affected specs: `specs/ui/spec.md`
- Affected code: `src/core/HandTracker.ts`, `src/main.ts`, `index.html`
