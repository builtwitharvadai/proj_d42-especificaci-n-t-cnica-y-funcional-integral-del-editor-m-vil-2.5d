import { AnimatedSprite, Application, Assets, Container, Spritesheet, Texture } from 'pixi.js';
import { CanvasEngine } from '@/engine/CanvasEngine';
import type { EngineConfig } from '@/types/engine.types';
import { DefaultLayers } from '@/types/layer.types';
import type {
  AnimatedSpriteConfig,
  SpritesheetConfig,
} from '@/types/animation.types';

const baseConfig: EngineConfig = {
  width: 800,
  height: 600,
  backgroundColor: 0x101010,
  gridCellSize: 32,
};

const SPRITESHEET_KEY = 'hero-walk';
const SPRITESHEET_CONFIG: SpritesheetConfig = {
  textureUrl: 'https://example.com/hero.png',
  dataUrl: 'https://example.com/hero.json',
};

const FRAMES = ['walk-0.png', 'walk-1.png', 'walk-2.png', 'walk-3.png'] as const;

/**
 * Patch Pixi's Application.init to avoid requiring a real WebGL context in
 * jsdom. Mirrors the stub used in the CanvasEngine integration suite so we
 * can exercise real CanvasEngine wiring together with a stubbed GPU layer.
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

function buildSpritesheetData(): Record<string, unknown> {
  return {
    frames: FRAMES.reduce<Record<string, unknown>>((acc, name, index) => {
      acc[name] = {
        frame: { x: index * 32, y: 0, w: 32, h: 32 },
        sourceSize: { w: 32, h: 32 },
        spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 },
      };
      return acc;
    }, {}),
    meta: {
      image: 'hero.png',
      format: 'RGBA8888',
      size: { w: 128, h: 32 },
      scale: 1,
    },
    animations: { walk: [...FRAMES] },
  };
}

describe('Animation Integration', () => {
  let engine: CanvasEngine;
  let initSpy: jest.SpyInstance;
  let destroySpy: jest.SpyInstance;
  let assetsLoadSpy: jest.SpyInstance;
  let spritesheetParseSpy: jest.SpyInstance;

  beforeEach(() => {
    initSpy = stubApplicationInit();
    destroySpy = jest
      .spyOn(Application.prototype, 'destroy')
      .mockImplementation(() => undefined);
    assetsLoadSpy = jest
      .spyOn(Assets, 'load')
      .mockImplementation(async (source: unknown) => {
        if (typeof source === 'string' && source.endsWith('.json')) {
          return buildSpritesheetData();
        }
        return Texture.EMPTY;
      });
    spritesheetParseSpy = jest
      .spyOn(Spritesheet.prototype, 'parse')
      .mockImplementation(async function (this: Spritesheet): Promise<Record<string, Texture>> {
        const textures = FRAMES.reduce<Record<string, Texture>>((acc, name) => {
          acc[name] = Texture.EMPTY;
          return acc;
        }, {});
        this.textures = textures;
        return textures;
      });

    engine = new CanvasEngine(baseConfig);
  });

  afterEach(() => {
    engine.destroy();
    initSpy.mockRestore();
    destroySpy.mockRestore();
    assetsLoadSpy.mockRestore();
    spritesheetParseSpy.mockRestore();
  });

  async function bootEngine(): Promise<void> {
    await engine.init();
    const animationManager = engine.getAnimationManager();
    await animationManager.loadSpritesheet(SPRITESHEET_KEY, SPRITESHEET_CONFIG);
    animationManager.defineClip(SPRITESHEET_KEY, {
      name: 'walk',
      frames: [...FRAMES],
      frameRate: 8,
      loop: true,
    });
    animationManager.defineClip(SPRITESHEET_KEY, {
      name: 'idle',
      frames: ['walk-0.png'],
      frameRate: 4,
      loop: false,
    });
  }

  it('loads a spritesheet and creates an animated sprite through the engine', async () => {
    await bootEngine();

    const animationManager = engine.getAnimationManager();
    const spriteConfig: AnimatedSpriteConfig = {
      spritesheetKey: SPRITESHEET_KEY,
      initialClip: 'walk',
      layerName: DefaultLayers.Entities,
      x: 50,
      y: 60,
      scale: 3,
      autoPlay: true,
    };
    const id = await animationManager.createAnimatedSprite(spriteConfig);

    const sprite = animationManager.getAnimatedSprite(id);
    expect(sprite).toBeInstanceOf(AnimatedSprite);
    expect(sprite?.x).toBe(50);
    expect(sprite?.y).toBe(60);
    expect(sprite?.scale.x).toBe(3);
    expect(sprite?.loop).toBe(true);

    const entities = engine
      .getLayerManager()
      .getLayer(DefaultLayers.Entities)!;
    expect(entities.children).toContain(sprite);

    const state = animationManager.getAnimationState(id);
    expect(state?.currentClip).toBe('walk');
    expect(state?.isPlaying).toBe(true);
    expect(state?.currentFrame).toBe(0);
  });

  it('renders animated sprites on the entities layer above the background z-order', async () => {
    await bootEngine();

    const animationManager = engine.getAnimationManager();
    const id = await animationManager.createAnimatedSprite({
      spritesheetKey: SPRITESHEET_KEY,
      initialClip: 'walk',
      layerName: DefaultLayers.Entities,
    });
    const sprite = animationManager.getAnimatedSprite(id)!;

    const layerManager = engine.getLayerManager();
    const background = layerManager.getLayer(DefaultLayers.Background)!;
    const entities = layerManager.getLayer(DefaultLayers.Entities)!;
    const ui = layerManager.getLayer(DefaultLayers.UI)!;

    expect(entities.children).toContain(sprite);
    expect(background.zIndex).toBeLessThan(entities.zIndex);
    expect(entities.zIndex).toBeLessThan(ui.zIndex);
  });

  it('supports switching between animation clips seamlessly', async () => {
    await bootEngine();

    const animationManager = engine.getAnimationManager();
    const id = await animationManager.createAnimatedSprite({
      spritesheetKey: SPRITESHEET_KEY,
      initialClip: 'walk',
      layerName: DefaultLayers.Entities,
      autoPlay: true,
    });
    const sprite = animationManager.getAnimatedSprite(id)!;

    expect(animationManager.getAnimationState(id)?.currentClip).toBe('walk');
    expect(sprite.loop).toBe(true);

    animationManager.playAnimation(id, 'idle');

    const state = animationManager.getAnimationState(id);
    expect(state?.currentClip).toBe('idle');
    expect(state?.isPlaying).toBe(true);
    expect(sprite.loop).toBe(false);

    animationManager.pauseAnimation(id);
    expect(animationManager.getAnimationState(id)?.isPaused).toBe(true);

    animationManager.stopAnimation(id);
    const stoppedState = animationManager.getAnimationState(id);
    expect(stoppedState?.isPlaying).toBe(false);
    expect(stoppedState?.isPaused).toBe(false);
    expect(stoppedState?.currentFrame).toBe(0);
  });

  it('allows multiple animated sprites to coexist on the same layer', async () => {
    await bootEngine();

    const animationManager = engine.getAnimationManager();
    const idA = await animationManager.createAnimatedSprite({
      spritesheetKey: SPRITESHEET_KEY,
      initialClip: 'walk',
      layerName: DefaultLayers.Entities,
      x: 10,
      autoPlay: true,
    });
    const idB = await animationManager.createAnimatedSprite({
      spritesheetKey: SPRITESHEET_KEY,
      initialClip: 'idle',
      layerName: DefaultLayers.Entities,
      x: 200,
    });

    expect(idA).not.toBe(idB);
    expect(animationManager.getAnimatedSpriteCount()).toBe(2);
    const entities = engine.getLayerManager().getLayer(DefaultLayers.Entities)!;
    expect(entities.children).toContain(animationManager.getAnimatedSprite(idA));
    expect(entities.children).toContain(animationManager.getAnimatedSprite(idB));

    expect(animationManager.getAnimationState(idA)?.isPlaying).toBe(true);
    expect(animationManager.getAnimationState(idB)?.isPlaying).toBe(false);

    expect(animationManager.removeAnimatedSprite(idA)).toBe(true);
    expect(animationManager.getAnimatedSpriteCount()).toBe(1);
    expect(animationManager.getAnimatedSprite(idA)).toBeUndefined();
    expect(animationManager.getAnimatedSprite(idB)).toBeDefined();
  });
});
