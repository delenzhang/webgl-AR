## 1. Video to Canvas Rendering
- [x] 1.1 Update `HandTracker.ts` `draw` method to draw video frames to canvas using `drawImage`.
- [x] 1.2 Ensure video frames are drawn before MediaPipe gesture overlays.
- [x] 1.3 Handle video mirroring (scaleX(-1)) in canvas drawing if needed.

## 2. MediaPipe Gesture Drawing Configuration
- [x] 2.1 Enhance MediaPipe drawing configuration (colors, line widths, landmark styles).
- [x] 2.2 Ensure gesture drawing overlays correctly on the video canvas.
- [x] 2.3 Test gesture recognition visualization on the canvas.

## 3. HTML and Rendering Updates
- [x] 3.1 Update `index.html` to hide video element or adjust CSS if video is only drawn on canvas.
- [x] 3.2 Update `main.ts` animation loop to ensure continuous video frame drawing.
- [x] 3.3 Verify canvas layering remains correct (video canvas behind Three.js canvas).

## 4. Validation
- [x] 4.1 Verify video content is visible on canvas.
- [x] 4.2 Verify MediaPipe gesture drawing appears correctly on top of video.
- [x] 4.3 Verify performance is acceptable with continuous video frame drawing.
