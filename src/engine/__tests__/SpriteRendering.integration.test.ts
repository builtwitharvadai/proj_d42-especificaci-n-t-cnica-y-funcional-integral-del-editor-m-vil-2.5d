import { Application, Assets, Container, Texture } from 'pixi.js';
import { CanvasEngine } from '@/engine/CanvasEngine';
import type { EngineConfig } from '@/types/engine.types';
import { DefaultLayers } from '@/types/layer.types';
import type { SpriteConfig } from '@/types/sprite.types';

jest.mock('pixi.js', () => {
  const actual = jest.requireActual('pixi.js');
  return {
    ...actual,
    Assets: {
      load: jest.fn(),
    },
  };
});

const mockedAssets = Assets as jest.Mocked<typeof Assets> & {
  load: jest.Mock;
};

const baseConfig: EngineConfig = {
  width: 800,
  height: 600,
  backgroundColor: 0x101010,
  gridCellSize: 32,
};

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

describe('Sprite Rendering Integration', () => {
  let engine: CanvasEngine;
  let initSpy: jest.SpyInstance;
  let destroySpy: jest.SpyInstance;

  beforeEach(async () => {
    mockedAssets.load.mockReset();
    mockedAssets.load.mockImplementation(async () => Texture.EMPTY);

    initSpy = stubApplicationInit();
    destroySpy = jest
      .spyOn(Application.prototype, 'destroy')
      .mockImplementation(() => undefined);
    engine = new CanvasEngine(baseConfig);
    await engine.init();
  });

  afterEach(() => {
    engine.destroy();
    initSpy.mockRestore();
    destroySpy.mockRestore();
  });

  it('loads textures and creates sprites on different layers', async () => {
    const spriteManager = engine.getSpriteManager();
    const layerManager = engine.getLayerManager();

    const bgConfig: SpriteConfig = {
      textureKey: 'bg.png',
      layerName: DefaultLayers.Background,
    };
    const entityConfig: SpriteConfig = {
      textureKey: 'hero.png',
      layerName: DefaultLayers.Entities,
    };
    const uiConfig: SpriteConfig = {
      textureKey: 'hud.png',
      layerName: DefaultLayers.UI,
    };

    const bgId = await spriteManager.createSprite(bgConfig);
    const entityId = await spriteManager.createSprite(entityConfig);
    const uiId = await spriteManager.createSprite(uiConfig);

    expect(spriteManager.getSprite(bgId)?.parent).toBe(
      layerManager.getLayer(DefaultLayers.Background)
    );
    expect(spriteManager.getSprite(entityId)?.parent).toBe(
      layerManager.getLayer(DefaultLayers.Entities)
    );
    expect(spriteManager.getSprite(uiId)?.parent).toBe(
      layerManager.getLayer(DefaultLayers.UI)
    );
  });

  it('renders sprites in the correct z-order based on layer', async () => {
    const spriteManager = engine.getSpriteManager();
    const layerManager = engine.getLayerManager();

    await spriteManager.createSprite({
      textureKey: 'bg.png',
      layerName: DefaultLayers.Background,
    });
    await spriteManager.createSprite({
      textureKey: 'hero.png',
      layerName: DefaultLayers.Entities,
    });
    await spriteManager.createSprite({
      textureKey: 'hud.png',
      layerName: DefaultLayers.UI,
    });

    const bg = layerManager.getLayer(DefaultLayers.Background)!;
    const entities = layerManager.getLayer(DefaultLayers.Entities)!;
    const ui = layerManager.getLayer(DefaultLayers.UI)!;

    expect(bg.zIndex).toBeLessThan(entities.zIndex);
    expect(entities.zIndex).toBeLessThan(ui.zIndex);
  });

  it('reuses a cached texture across sprites (single Assets.load call per key)', async () => {
    const spriteManager = engine.getSpriteManager();
    const textureCache = engine.getTextureCache();

    await spriteManager.createSprite({
      textureKey: 'shared.png',
      layerName: DefaultLayers.Entities,
      x: 0,
    });
    await spriteManager.createSprite({
      textureKey: 'shared.png',
      layerName: DefaultLayers.Entities,
      x: 100,
    });
    await spriteManager.createSprite({
      textureKey: 'shared.png',
      layerName: DefaultLayers.Entities,
      x: 200,
    });

    const sharedLoadCalls = mockedAssets.load.mock.calls.filter(
      (call) => call[0] === 'shared.png'
    );
    expect(sharedLoadCalls).toHaveLength(1);

    const stats = textureCache.getCacheStats();
    expect(stats.keys).toContain('shared.png');
    expect(stats.size).toBe(1);
  });

  it('reports the expected sprite count per layer', async () => {
    const spriteManager = engine.getSpriteManager();
    const layerManager = engine.getLayerManager();

    await spriteManager.createSprite({
      textureKey: 'a.png',
      layerName: DefaultLayers.Entities,
    });
    await spriteManager.createSprite({
      textureKey: 'b.png',
      layerName: DefaultLayers.Entities,
    });
    await spriteManager.createSprite({
      textureKey: 'c.png',
      layerName: DefaultLayers.UI,
    });

    const metadata = new Map(
      layerManager.getAllLayers().map((m) => [m.name, m])
    );
    expect(metadata.get(DefaultLayers.Entities)?.spriteCount).toBe(2);
    expect(metadata.get(DefaultLayers.UI)?.spriteCount).toBe(1);
    // Background layer contains the grid plus any sprites we added (none here).
    expect(metadata.get(DefaultLayers.Background)?.spriteCount).toBeGreaterThanOrEqual(1);
  });

  it('reflects updates in the rendered sprite state', async () => {
    const spriteManager = engine.getSpriteManager();

    const id = await spriteManager.createSprite({
      textureKey: 'hero.png',
      layerName: DefaultLayers.Entities,
      x: 0,
      y: 0,
    });

    const ok = await spriteManager.updateSprite(id, {
      x: 200,
      y: 150,
      visible: false,
    });

    expect(ok).toBe(true);
    const sprite = spriteManager.getSprite(id);
    expect(sprite?.x).toBe(200);
    expect(sprite?.y).toBe(150);
    expect(sprite?.visible).toBe(false);

    const metadata = spriteManager.getAllSprites().find((m) => m.id === id);
    expect(metadata?.x).toBe(200);
    expect(metadata?.y).toBe(150);
    expect(metadata?.visible).toBe(false);
  });
});
