## Context
The goal is to have a "Flying Sword" (御剑术) effect where the user sees themselves on camera with 3D swords floating around them.

## Goals
- Camera feed as background.
- Transparent 3D overlay for swords.
- Bloom effects without losing background transparency.

## Decisions
- **Transparency in Post-processing**: `UnrealBloomPass` by default renders to an opaque buffer. We will use a custom approach or configure the composer to maintain the alpha channel.
- **Layering**: Use CSS `z-index` and `pointer-events: none` on overlay canvases to ensure the UI remains interactive if needed, though the primary interaction is via camera.

## Risks / Trade-offs
- `UnrealBloomPass` transparency can be tricky. If it fails, we might need a separate scene for bloom or a custom shader.
