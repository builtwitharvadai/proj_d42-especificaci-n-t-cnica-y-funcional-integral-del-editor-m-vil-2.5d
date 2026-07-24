/**
 * Engine configuration options used to initialize the canvas engine.
 */
export interface EngineConfig {
  /** Canvas width in pixels. */
  width: number;
  /** Canvas height in pixels. */
  height: number;
  /** Background color as a 24-bit RGB number (e.g. 0x1a1a2e). */
  backgroundColor: number;
  /** Size of each grid cell in pixels. */
  gridCellSize: number;
}

/**
 * Configuration for the grid overlay rendering.
 */
export interface GridConfig {
  /** Size of each grid cell in pixels. */
  cellSize: number;
  /** Color of the grid lines as a 24-bit RGB number. */
  lineColor: number;
  /** Width of the grid lines in pixels. */
  lineWidth: number;
}

/**
 * A coordinate expressed in grid space (integer cell indices).
 */
export interface GridCoordinate {
  /** Horizontal position in grid cells. */
  x: number;
  /** Vertical position in grid cells. */
  y: number;
}

/**
 * A coordinate expressed in screen space (pixels).
 */
export interface ScreenCoordinate {
  /** Horizontal position in pixels. */
  x: number;
  /** Vertical position in pixels. */
  y: number;
}

/**
 * The current viewport transform state used by the camera.
 */
export interface ViewportState {
  /** Horizontal offset applied to world content, in pixels. */
  offsetX: number;
  /** Vertical offset applied to world content, in pixels. */
  offsetY: number;
  /** Zoom factor (1.0 means no zoom). */
  scale: number;
}
