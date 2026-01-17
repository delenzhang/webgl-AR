## MODIFIED Requirements

### Requirement: Camera Background Output
The system SHALL display the live camera stream as a full-screen background behind all interactive and visual elements by drawing video frames to a canvas element.

#### Scenario: Camera background is visible on canvas
- **WHEN** the application starts and camera permission is granted
- **THEN** the video frames are drawn to the `#output-canvas` element, and the canvas is positioned behind the Three.js canvas.

#### Scenario: Video frames are continuously drawn
- **WHEN** the camera stream is active
- **THEN** video frames are continuously drawn to the canvas in the animation loop or MediaPipe callback.

## ADDED Requirements

### Requirement: MediaPipe Gesture Visualization
The system SHALL draw recognized hand gestures on the canvas using MediaPipe's drawing utilities, overlaying the gesture visualization on top of the video frames.

#### Scenario: Gesture landmarks are drawn on canvas
- **WHEN** MediaPipe detects hand landmarks
- **THEN** hand landmarks and connections are drawn on the canvas using configured colors and styles.

#### Scenario: Gesture drawing overlays video
- **WHEN** both video frames and MediaPipe results are available
- **THEN** the gesture visualization is drawn on top of the video frames on the same canvas.
