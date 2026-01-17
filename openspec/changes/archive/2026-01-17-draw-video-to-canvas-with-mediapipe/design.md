## Context
The current implementation displays video directly via HTML5 `<video>` element, while MediaPipe results are drawn on a separate canvas. The user wants to consolidate this by drawing video frames to the canvas and overlaying MediaPipe gesture visualization.

## Goals
- Draw video frames to canvas instead of using direct video element display.
- Configure MediaPipe to draw recognized gestures on the canvas.
- Maintain performance with continuous frame drawing.
- Preserve existing gesture recognition functionality.

## Decisions
- **Video Drawing Method**: Use `CanvasRenderingContext2D.drawImage()` to draw video frames to canvas in the animation loop or in the MediaPipe results callback.
- **Drawing Order**: Draw video frame first, then MediaPipe gesture overlays on top.
- **Video Element**: Keep video element for MediaPipe processing, but hide it visually (or keep it for debugging).
- **Mirroring**: Apply mirroring transformation in canvas drawing if needed to match current `scaleX(-1)` behavior.

## Risks / Trade-offs
- **Performance**: Continuous video frame drawing may impact performance. Monitor frame rate and optimize if needed.
- **Video Element**: May need to keep video element for MediaPipe processing even if not displayed, or use `getUserMedia` stream directly.
