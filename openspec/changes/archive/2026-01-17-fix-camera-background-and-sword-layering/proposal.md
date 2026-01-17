# Change: Fix Camera Background and Sword Layering

## Why
The current implementation fails to properly display the camera stream as a background because the Three.js canvas (managed by EffectComposer) might be opaque, and the layering in HTML/CSS needs to be more explicit to ensure the camera is behind the 3D content. The user also requested an upper layer canvas for drawing "particle green swords".

## What Changes
- **MODIFIED** `index.html`: Update CSS and HTML structure to ensure clear layering between the video background and the 3D overlay.
- **MODIFIED** `src/core/SceneManager.ts`: Fix transparency issues when using `EffectComposer` and `UnrealBloomPass`.
- **MODIFIED** `src/main.ts`: Ensure the canvases are correctly positioned and sized.
- **MODIFIED** `src/core/SwordSystem.ts`: Ensure "particle green swords" are visually distinct and correctly layered.

## Impact
- Affected specs: `specs/ui/spec.md` (to be created/updated)
- Affected code: `index.html`, `src/core/SceneManager.ts`, `src/main.ts`, `src/core/SwordSystem.ts`
