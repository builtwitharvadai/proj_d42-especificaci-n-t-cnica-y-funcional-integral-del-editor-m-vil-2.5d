import { Grid } from '@/engine/Grid';
import type { GridConfig, ViewportState } from '@/types/engine.types';

const baseConfig: GridConfig = {
  cellSize: 32,
  lineColor: 0x333333,
  lineWidth: 1,
};

const identityViewport: ViewportState = { offsetX: 0, offsetY: 0, scale: 1 };

describe('Grid', () => {
  describe('constructor', () => {
    it('creates an instance with the given configuration', () => {
      const grid = new Grid({ ...baseConfig });
      expect(grid).toBeInstanceOf(Grid);
      grid.destroy();
    });

    it('throws for a non-positive cellSize', () => {
      expect(() => new Grid({ ...baseConfig, cellSize: 0 })).toThrow(/cellSize/);
      expect(() => new Grid({ ...baseConfig, cellSize: -8 })).toThrow(/cellSize/);
    });

    it('throws for a non-positive lineWidth', () => {
      expect(() => new Grid({ ...baseConfig, lineWidth: 0 })).toThrow(/lineWidth/);
      expect(() => new Grid({ ...baseConfig, lineWidth: -1 })).toThrow(/lineWidth/);
    });
  });

  describe('render', () => {
    it('clears previous geometry and draws vertical + horizontal lines', () => {
      const grid = new Grid({ ...baseConfig });
      const clearSpy = jest.spyOn(grid, 'clear');
      const moveToSpy = jest.spyOn(grid, 'moveTo');
      const lineToSpy = jest.spyOn(grid, 'lineTo');
      const strokeSpy = jest.spyOn(grid, 'stroke');

      grid.render(identityViewport, 96, 64);

      expect(clearSpy).toHaveBeenCalledTimes(1);
      // 4 vertical lines (cols 0..3) + 3 horizontal lines (rows 0..2) = 7 moveTo/lineTo pairs.
      const expectedCols = 4;
      const expectedRows = 3;
      const expectedLines = expectedCols + expectedRows;
      expect(moveToSpy).toHaveBeenCalledTimes(expectedLines);
      expect(lineToSpy).toHaveBeenCalledTimes(expectedLines);
      expect(strokeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ width: 1, color: 0x333333 })
      );

      grid.destroy();
    });

    it('only draws lines within the visible viewport (culling)', () => {
      const grid = new Grid({ ...baseConfig });
      const moveToSpy = jest.spyOn(grid, 'moveTo');

      // Viewport shifted so world (0,0) is way off-screen to the top-left.
      const viewport: ViewportState = { offsetX: -1000, offsetY: -1000, scale: 1 };
      grid.render(viewport, 64, 64);

      // For a 64x64 canvas at cellSize 32 we expect ~3 vertical + ~3 horizontal lines,
      // NOT lines for every world column from 0 upward.
      expect(moveToSpy.mock.calls.length).toBeLessThan(20);
      expect(moveToSpy.mock.calls.length).toBeGreaterThan(0);

      grid.destroy();
    });

    it('scales the visible range with the viewport scale', () => {
      const grid = new Grid({ ...baseConfig });
      const moveToSpy = jest.spyOn(grid, 'moveTo');

      grid.render({ offsetX: 0, offsetY: 0, scale: 2 }, 64, 64);

      // scaledCell = 64, canvas 64x64 => 2 cols + 2 rows lines.
      expect(moveToSpy).toHaveBeenCalledTimes(4);

      grid.destroy();
    });

    it('bails out safely when scale is non-positive', () => {
      const grid = new Grid({ ...baseConfig });
      const moveToSpy = jest.spyOn(grid, 'moveTo');
      const strokeSpy = jest.spyOn(grid, 'stroke');

      grid.render({ offsetX: 0, offsetY: 0, scale: 0 }, 100, 100);

      expect(moveToSpy).not.toHaveBeenCalled();
      expect(strokeSpy).not.toHaveBeenCalled();

      grid.destroy();
    });
  });

  describe('destroy', () => {
    it('clears geometry and delegates to Graphics.destroy', () => {
      const grid = new Grid({ ...baseConfig });
      const clearSpy = jest.spyOn(grid, 'clear');

      grid.destroy();

      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
