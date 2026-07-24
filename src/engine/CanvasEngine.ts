import { Application, Container, type FederatedPointerEvent } from 'pixi.js';
import type { EngineConfig, GridConfig } from '@/types/engine.types';
import { Grid } from '@/engine/Grid';
import { Viewport } from '@/engine/Viewport';
import { LayerManager } from '@/engine/LayerManager';
import { DefaultLayers } from '@/types/layer.types';

const DEFAULT_GRID_CONFIG: Omit<GridConfig, 'cellSize'> = {
  lineColor: 0x2a2a4a,
  lineWidth: 1,
};

/**
 * CanvasEngine wires a PixiJS Application together with a grid overlay,
 * a viewport (pan/zoom camera), pointer input for drag-panning, and a
 * multi-layer rendering pipeline managed by {@link LayerManager}.
 */
export class CanvasEngine {
  private readonly engineConfig: EngineConfig;
  private readonly gridConfig: GridConfig;
  private readonly app: Application;
  private readonly viewport: Viewport;
  private readonly world: Container;
  private readonly grid: Grid;
  private layerManager: LayerManager | null = null;

  private initialized = false;
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private readonly boundResize: () => void;
  private readonly boundRender: () => void;
  private readonly boundPointerDown: (e: FederatedPointerEvent) => void;
  private readonly boundPointerMove: (e: FederatedPointerEvent) => void;
  private readonly boundPointerUp: (e: FederatedPointerEvent) => void;

  constructor(config: EngineConfig, gridConfig?: Partial<GridConfig>) {
    this.engineConfig = { ...config };
    this.gridConfig = {
      cellSize: gridConfig?.cellSize ?? config.gridCellSize,
      lineColor: gridConfig?.lineColor ?? DEFAULT_GRID_CONFIG.lineColor,
      lineWidth: gridConfig?.lineWidth ?? DEFAULT_GRID_CONFIG.lineWidth,
    };

    this.app = new Application();
    this.viewport = new Viewport();
    this.world = new Container();
    this.grid = new Grid(this.gridConfig);

    this.boundResize = this.handleResize.bind(this);
    this.boundRender = this.render.bind(this);
    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
  }

  /** Initialize the PixiJS Application and attach to the DOM stage. */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.app.init({
      background: this.engineConfig.backgroundColor,
      width: this.engineConfig.width,
      height: this.engineConfig.height,
      antialias: true,
      resizeTo: typeof window !== 'undefined' ? window : undefined,
    });

    this.app.stage.addChild(this.world);

    this.layerManager = new LayerManager(this.world);
    this.layerManager.initializeDefaultLayers();

    const backgroundLayer = this.layerManager.getLayer(DefaultLayers.Background);
    if (backgroundLayer) {
      backgroundLayer.addChild(this.grid);
    }

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on('pointerdown', this.boundPointerDown);
    this.app.stage.on('pointermove', this.boundPointerMove);
    this.app.stage.on('pointerup', this.boundPointerUp);
    this.app.stage.on('pointerupoutside', this.boundPointerUp);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.boundResize);
    }

    this.app.ticker.add(this.boundRender);
    this.initialized = true;
    this.render();
  }

  /** Perform one frame of grid rendering based on the current viewport. */
  public render(): void {
    if (!this.initialized) {
      return;
    }
    this.grid.render(
      this.viewport.getState(),
      this.app.screen.width,
      this.app.screen.height
    );
  }

  /** Pointer-down: start drag-panning. */
  public onPointerDown(event: FederatedPointerEvent): void {
    this.isDragging = true;
    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
  }

  /** Pointer-move: while dragging, pan the viewport by the delta. */
  public onPointerMove(event: FederatedPointerEvent): void {
    if (!this.isDragging) {
      return;
    }
    const dx = event.global.x - this.lastPointerX;
    const dy = event.global.y - this.lastPointerY;
    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
    this.viewport.pan(dx, dy);
  }

  /** Pointer-up: end the drag-panning gesture. */
  public onPointerUp(_event: FederatedPointerEvent): void {
    this.isDragging = false;
  }

  /** Get the viewport instance (for pan/zoom/reset control). */
  public getViewport(): Viewport {
    return this.viewport;
  }

  /** Get the underlying PixiJS Application. */
  public getApp(): Application {
    return this.app;
  }

  /** Get the canvas element created by PixiJS. */
  public getCanvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  /**
   * Get the LayerManager. Only available after {@link init} has been called;
   * throws if accessed before initialization.
   */
  public getLayerManager(): LayerManager {
    if (!this.layerManager) {
      throw new Error(
        'CanvasEngine.getLayerManager(): engine has not been initialized. Call init() first.'
      );
    }
    return this.layerManager;
  }

  /** Tear down PixiJS resources and detach event listeners. */
  public destroy(): void {
    if (!this.initialized) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.boundResize);
    }
    this.app.ticker.remove(this.boundRender);

    this.app.stage.off('pointerdown', this.boundPointerDown);
    this.app.stage.off('pointermove', this.boundPointerMove);
    this.app.stage.off('pointerup', this.boundPointerUp);
    this.app.stage.off('pointerupoutside', this.boundPointerUp);

    this.grid.destroy();
    this.world.destroy({ children: true });
    this.app.destroy(true, { children: true });
    this.layerManager = null;
    this.initialized = false;
  }

  private handleResize(): void {
    this.render();
  }
}
