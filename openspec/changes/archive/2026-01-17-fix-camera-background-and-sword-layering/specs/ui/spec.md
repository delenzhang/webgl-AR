## ADDED Requirements

### Requirement: Camera Background Output
The system SHALL display the live camera stream as a full-screen background behind all interactive and visual elements.

#### Scenario: Camera background is visible
- **WHEN** the application starts and camera permission is granted
- **THEN** the `#input-video` element shows the camera stream and is positioned behind the Three.js canvas.

### Requirement: Transparent 3D Sword Overlay
The system SHALL render 3D sword models and particle effects on a transparent canvas that sits on top of the camera background.

#### Scenario: 3D swords are layered on top
- **WHEN** the scene is rendering
- **THEN** the Three.js canvas shows the main sword and particle swords with a transparent background, allowing the video to be seen through.

### Requirement: Post-processing Transparency
The post-processing effects (e.g., Bloom) SHALL NOT obscure the background camera stream.

#### Scenario: Bloom effect with transparency
- **WHEN** the bloom effect is active
- **THEN** the glow is visible around the swords, but the rest of the canvas remains transparent.
