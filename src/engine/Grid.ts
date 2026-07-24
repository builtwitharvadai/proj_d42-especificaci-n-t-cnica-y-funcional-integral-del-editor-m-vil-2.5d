import { Graphics } from 'pixi.js';
import type { GridConfig, ViewportState } from '@/types/engine.types';

/**
 * Grid renders a configurable, viewport-aware rectangular grid using
 * PixiJS Graphics. Only lines intersecting the visible canvas region
 * are drawn, keeping the draw call cheap at any zoom level.
 */
export class Grid extends Graphics {
  private readonly config: GridConfig;

  constructor(config: GridConfig) {
    super();
    if (!Number.isFinite(config.cellSize) || config.cellSize <= 0) {
      throw new Error(
        `Grid: cellSize must be a positive finite number, got ${config.cellSize}`
      );
    }
    if (!Number.isFinite(config.lineWidth) || config.lineWidth <= 0) {
      throw new Error(
        `Grid: lineWidth must be a positive finite number, got ${config.lineWidth}`
      );
    }
    this.config = { ...config };
  }

  /**
   * Redraw the grid for the given viewport and canvas dimensions.
   * Existing geometry is cleared first. Only grid lines within the
   * visible canvas region are emitted.
   */
  public render(
    viewport: ViewportState,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.clear();

    const { cellSize, lineColor, lineWidth } = this.config;
    const { offsetX, offsetY, scale } = viewport;

    if (scale <= 0) {
      return;
    }

    const scaledCell = cellSize * scale;
    if (scaledCell <= 0) {
      return;
    }

    // World coordinates visible on screen.
    const worldLeft = -offsetX / scale;
    const worldTop = -offsetY / scale;
    const worldRight = worldLeft + canvasWidth / scale;
    const worldBottom = worldTop + canvasHeight / scale;

    const startCol = Math.floor(worldLeft / cellSize);
    const endCol = Math.ceil(worldRight / cellSize);
    const startRow = Math.floor(worldTop / cellSize);
    const endRow = Math.ceil(worldBottom / cellSize);

    // Vertical lines.
    for (let col = startCol; col <= endCol; col++) {
      const screenX = col * scaledCell + offsetX;
      this.moveTo(screenX, 0);
      this.lineTo(screenX, canvasHeight);
    }

    // Horizontal lines.
    for (let row = startRow; row <= endRow; row++) {
      const screenY = row * scaledCell + offsetY;
      this.moveTo(0, screenY);
      this.lineTo(canvasWidth, screenY);
    }

    this.stroke({ width: lineWidth, color: lineColor });
  }

  /**
   * Release GPU/PIXI resources held by this Graphics instance.
   */
  public override destroy(): void {
    this.clear();
    super.destroy();
  }
}
