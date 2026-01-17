## 1. UI Layering and Camera Background
- [x] 1.1 Update `index.html` CSS to ensure `#video-container` is strictly behind all canvases.
- [x] 1.2 Update `SceneManager.ts` to ensure the `WebGLRenderer` and `EffectComposer` preserve transparency.
- [x] 1.3 Add a `ClearPass` or adjust `UnrealBloomPass` settings to prevent black background in post-processing.

## 2. Sword Overlay Enhancements
- [x] 2.1 Verify `SwordSystem.ts` correctly renders the "particle green swords" (InstancedMesh) on the transparent Three.js canvas.
- [x] 2.2 Adjust `main.ts` to ensure the Three.js canvas is correctly layered above the camera video.

## 3. Validation
- [x] 3.1 Verify camera stream is visible as background.
- [x] 3.2 Verify 3D swords are visible and glowing on top of the camera stream.
