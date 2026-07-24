import { CoordinateTransform } from '@/utils/CoordinateTransform';
import type {
  GridCoordinate,
  ScreenCoordinate,
  ViewportState,
} from '@/types/engine.types';

describe('CoordinateTransform', () => {
  const identityViewport: ViewportState = { offsetX: 0, offsetY: 0, scale: 1 };

  describe('screenToGrid', () => {
    it('converts the screen origin to grid (0, 0) with an identity viewport', () => {
      const cell = CoordinateTransform.screenToGrid(
        { x: 0, y: 0 },
        identityViewport,
        32
      );
      expect(cell).toEqual<GridCoordinate>({ x: 0, y: 0 });
    });

    it('accounts for viewport offset when mapping screen to grid', () => {
      const viewport: ViewportState = { offsetX: 100, offsetY: 100, scale: 1 };
      const cell = CoordinateTransform.screenToGrid(
        { x: 132, y: 132 },
        viewport,
        32
      );
      expect(cell).toEqual<GridCoordinate>({ x: 1, y: 1 });
    });

    it('floors partial cell positions', () => {
      const cell = CoordinateTransform.screenToGrid(
        { x: 63, y: 31 },
        identityViewport,
        32
      );
      expect(cell).toEqual<GridCoordinate>({ x: 1, y: 0 });
    });

    it('accounts for viewport scale', () => {
      const viewport: ViewportState = { offsetX: 0, offsetY: 0, scale: 2 };
      const cell = CoordinateTransform.screenToGrid({ x: 64, y: 64 }, viewport, 32);
      expect(cell).toEqual<GridCoordinate>({ x: 1, y: 1 });
    });
  });

  describe('gridToScreen', () => {
    it('converts the grid origin to screen (0, 0) with an identity viewport', () => {
      const px = CoordinateTransform.gridToScreen(
        { x: 0, y: 0 },
        identityViewport,
        32
      );
      expect(px).toEqual<ScreenCoordinate>({ x: 0, y: 0 });
    });

    it('accounts for viewport offset when mapping grid to screen', () => {
      const viewport: ViewportState = { offsetX: 100, offsetY: 100, scale: 1 };
      const px = CoordinateTransform.gridToScreen({ x: 1, y: 1 }, viewport, 32);
      expect(px).toEqual<ScreenCoordinate>({ x: 132, y: 132 });
    });

    it('accounts for viewport scale', () => {
      const viewport: ViewportState = { offsetX: 0, offsetY: 0, scale: 2 };
      const px = CoordinateTransform.gridToScreen({ x: 3, y: 4 }, viewport, 32);
      expect(px).toEqual<ScreenCoordinate>({ x: 192, y: 256 });
    });
  });

  describe('round-trip', () => {
    it('screen -> grid -> screen yields the top-left of the original cell', () => {
      const viewport: ViewportState = { offsetX: 50, offsetY: 25, scale: 1 };
      const cellSize = 32;
      const start: ScreenCoordinate = { x: 50, y: 25 };

      const cell = CoordinateTransform.screenToGrid(start, viewport, cellSize);
      const back = CoordinateTransform.gridToScreen(cell, viewport, cellSize);

      expect(back).toEqual<ScreenCoordinate>(start);
    });

    it('grid -> screen -> grid yields the original grid coordinate', () => {
      const viewport: ViewportState = { offsetX: -30, offsetY: 90, scale: 1.5 };
      const cellSize = 24;
      const original: GridCoordinate = { x: 5, y: -3 };

      const screen = CoordinateTransform.gridToScreen(original, viewport, cellSize);
      const back = CoordinateTransform.screenToGrid(screen, viewport, cellSize);

      expect(back).toEqual<GridCoordinate>(original);
    });
  });

  describe('input validation', () => {
    it('throws when cellSize is negative in screenToGrid', () => {
      expect(() =>
        CoordinateTransform.screenToGrid({ x: 0, y: 0 }, identityViewport, -1)
      ).toThrow(/cellSize/);
    });

    it('throws when cellSize is zero in screenToGrid', () => {
      expect(() =>
        CoordinateTransform.screenToGrid({ x: 0, y: 0 }, identityViewport, 0)
      ).toThrow(/cellSize/);
    });

    it('throws when cellSize is negative in gridToScreen', () => {
      expect(() =>
        CoordinateTransform.gridToScreen({ x: 0, y: 0 }, identityViewport, -1)
      ).toThrow(/cellSize/);
    });

    it('throws when cellSize is not finite', () => {
      expect(() =>
        CoordinateTransform.screenToGrid(
          { x: 0, y: 0 },
          identityViewport,
          Number.POSITIVE_INFINITY
        )
      ).toThrow(/cellSize/);
    });
  });
});
