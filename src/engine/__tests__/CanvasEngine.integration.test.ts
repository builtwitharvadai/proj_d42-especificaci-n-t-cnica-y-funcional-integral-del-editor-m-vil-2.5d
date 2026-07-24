import { Application, Container } from 'pixi.js';
import { CanvasEngine } from '@/engine/CanvasEngine';
import type { EngineConfig } from '@/types/engine.types';
import { DefaultLayers } from '@/types/layer.types';

const baseConfig: EngineConfig = {
  width: 800,
  height: 600,
  backgroundColor: 0x101010,
  gridCellSize: 32,
};

/**
 * Patch Pixi's Application.init to avoid requiring a real WebGL context in jsdom.
 * We still exercise the real CanvasEngine wiring; only the GPU-bound initialisation
 * and the underlying canvas element are stubbed.
 */
function stubApplicationInit(): jest.SpyInstance {
  return jest
    .spyOn(Application.prototype, 'init')
    .mockImplementation(async function (this: Application): Promise<void> {
      const stage = new Container();
      Object.defineProperty(this, 'stage', { value: stage, configurable: true });
      Object.defineProperty(this, 'screen', {
        value: { width: baseConfig.width, height: baseConfig.height },
        configurable: true,
      });
      Object.defineProperty(this, 'canvas', {
        value: document.createElement('canvas'),
        configurable: true,
      });
      Object.defineProperty(this, 'ticker', {
        value: { add: jest.fn(), remove: jest.fn() },
        configurable: true,
      });
      Object.defineProperty(this, 'renderer', {
        value: { resize: jest.fn(), destroy: jest.fn() },
        configurable: true,
      });
    });
}

describe('CanvasEngine Integration', () => {
  let engine: CanvasEngine;
  let initSpy: jest.SpyInstance;
  let destroySpy: jest.SpyInstance;

  beforeEach(() => {
    initSpy = stubApplicationInit();
    destroySpy = jest
      .spyOn(Application.prototype, 'destroy')
      .mockImplementation(() => undefined);
    engine = new CanvasEngine(baseConfig);
  });

  afterEach(() => {
    engine.destroy();
    initSpy.mockRestore();
    destroySpy.mockRestore();
  });

  it('initializes with default layers via the LayerManager', async () => {
    await engine.init();

    const layerManager = engine.getLayerManager();
    expect(layerManager.getLayer(DefaultLayers.Background)).toBeInstanceOf(Container);
    expect(layerManager.getLayer(DefaultLayers.Entities)).toBeInstanceOf(Container);
    expect(layerManager.getLayer(DefaultLayers.UI)).toBeInstanceOf(Container);

    const metadata = layerManager.getAllLayers();
    expect(metadata.map((m) => m.name)).toEqual([
      DefaultLayers.Background,
      DefaultLayers.Entities,
      DefaultLayers.UI,
    ]);
  });

  it('adds the Grid to the background layer', async () => {
    await engine.init();

    const background = engine.getLayerManager().getLayer(DefaultLayers.Background);
    expect(background).toBeDefined();
    expect(background!.children.length).toBeGreaterThan(0);
    // The grid is the only child added by CanvasEngine to the background layer.
    expect(background!.children[0]?.constructor.name).toBe('Grid');
  });

  it('exposes the LayerManager through getLayerManager()', async () => {
    await engine.init();
    const layerManager = engine.getLayerManager();
    expect(layerManager).toBeDefined();
    expect(typeof layerManager.createLayer).toBe('function');
  });

  it('throws when getLayerManager() is called before init()', () => {
    expect(() => engine.getLayerManager()).toThrow(/init/);
  });

  it('renders sprites in the correct z-order across layers', async () => {
    await engine.init();

    const layerManager = engine.getLayerManager();
    const bg = layerManager.getLayer(DefaultLayers.Background)!;
    const entities = layerManager.getLayer(DefaultLayers.Entities)!;
    const ui = layerManager.getLayer(DefaultLayers.UI)!;

    const bgSprite = new Container();
    const entitySprite = new Container();
    const uiSprite = new Container();

    bg.addChild(bgSprite);
    entities.addChild(entitySprite);
    ui.addChild(uiSprite);

    expect(bg.zIndex).toBeLessThan(entities.zIndex);
    expect(entities.zIndex).toBeLessThan(ui.zIndex);

    const parent = bg.parent;
    expect(parent).toBeDefined();

    const orderedChildren = parent!.children
      .slice()
      .sort((a, b) => a.zIndex - b.zIndex);

    expect(orderedChildren[0]).toBe(bg);
    expect(orderedChildren[1]).toBe(entities);
    expect(orderedChildren[2]).toBe(ui);
  });
});
