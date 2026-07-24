import type {
  GridCoordinate,
  ScreenCoordinate,
  ViewportState,
} from '@/types/engine.types';

/**
 * Utility class for converting between screen coordinates and grid
 * coordinates. All conversions take the current viewport transform
 * (offset + scale) and the grid cell size into account.
 */
export class CoordinateTransform {
  /**
   * Convert a screen-space pixel coordinate into a grid cell index.
   *
   * @example
   * ```ts
   * const cell = CoordinateTransform.screenToGrid(
   *   { x: 128, y: 64 },
   *   { offsetX: 0, offsetY: 0, scale: 1 },
   *   32,
   * );
   * // => { x: 4, y: 2 }
   * ```
   *
   * @param screenCoord - Pixel coordinate on the screen/canvas.
   * @param viewport - Current viewport transform.
   * @param cellSize - Size of one grid cell in pixels (must be > 0).
   * @returns The grid cell containing the given screen pixel.
   * @throws {Error} If `cellSize` is not a positive finite number.
   */
  public static screenToGrid(
    screenCoord: ScreenCoordinate,
    viewport: ViewportState,
    cellSize: number
  ): GridCoordinate {
    CoordinateTransform.assertValidCellSize(cellSize);

    const worldX = (screenCoord.x - viewport.offsetX) / viewport.scale;
    const worldY = (screenCoord.y - viewport.offsetY) / viewport.scale;

    return {
      x: Math.floor(worldX / cellSize),
      y: Math.floor(worldY / cellSize),
    };
  }

  /**
   * Convert a grid cell index into its top-left screen-space pixel
   * coordinate.
   *
   * @example
   * ```ts
   * const px = CoordinateTransform.gridToScreen(
   *   { x: 4, y: 2 },
   *   { offsetX: 0, offsetY: 0, scale: 1 },
   *   32,
   * );
   * // => { x: 128, y: 64 }
   * ```
   *
   * @param gridCoord - Grid cell index.
   * @param viewport - Current viewport transform.
   * @param cellSize - Size of one grid cell in pixels (must be > 0).
   * @returns The pixel coordinate of the cell's top-left corner.
   * @throws {Error} If `cellSize` is not a positive finite number.
   */
  public static gridToScreen(
    gridCoord: GridCoordinate,
    viewport: ViewportState,
    cellSize: number
  ): ScreenCoordinate {
    CoordinateTransform.assertValidCellSize(cellSize);

    return {
      x: gridCoord.x * cellSize * viewport.scale + viewport.offsetX,
      y: gridCoord.y * cellSize * viewport.scale + viewport.offsetY,
    };
  }

  private static assertValidCellSize(cellSize: number): void {
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new Error(
        `CoordinateTransform: cellSize must be a positive finite number, got ${cellSize}`
      );
    }
  }
}
