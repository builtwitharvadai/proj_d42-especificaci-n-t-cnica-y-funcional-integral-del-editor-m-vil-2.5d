import { AnimatedSprite, Assets, Container, Spritesheet, Texture } from 'pixi.js';
import { AnimationManager } from '@/engine/AnimationManager';
import { LayerManager } from '@/engine/LayerManager';
import type {
  AnimatedSpriteConfig,
  AnimationClip,
  SpritesheetConfig,
} from '@/types/animation.types';

jest.mock('@/engine/LayerManager');

const MockedLayerManager = LayerManager as jest.MockedClass<typeof LayerManager>;

const SPRITESHEET_KEY = 'test-walk';
const SPRITESHEET_CONFIG: SpritesheetConfig = {
  textureUrl: 'https://example.com/atlas.png',
  dataUrl: 'https://example.com/atlas.json',
};

const WALK_CLIP: AnimationClip = {
  name: 'walk',
  frames: ['walk-0.png', 'walk-1.png', 'walk-2.png', 'walk-3.png'],
  frameRate: 8,
  loop: true,
};

const IDLE_CLIP: AnimationClip = {
  name: 'idle',
  frames: ['walk-0.png'],
  frameRate: 4,
  loop: false,
};

function createFrameTextures(frameNames: string[]): Record<string, Texture> {
  return frameNames.reduce<Record<string, Texture>>((acc, name) => {
    acc[name] = Texture.EMPTY;
    return acc;
  }, {});
}

describe('AnimationManager', () => {
  let layerManager: jest.Mocked<LayerManager>;
  let entitiesLayer: Container;
  let manager: AnimationManager;
  let warnSpy: jest.SpyInstance;
  let assetsLoadSpy: jest.SpyInstance;
  let spritesheetParseSpy: jest.SpyInstance;

  beforeEach(() => {
    MockedLayerManager.mockClear();

    entitiesLayer = new Container();
    layerManager = new MockedLayerManager(new Container()) as jest.Mocked<LayerManager>;
    layerManager.getLayer = jest.fn().mockImplementation((name: string) => {
      if (name === 'entities') return entitiesLayer;
      return undefined;
    });

    assetsLoadSpy = jest
      .spyOn(Assets, 'load')
      .mockImplementation(async (source: unknown) => {
        if (typeof source === 'string' && source.endsWith('.json')) {
          return {
            frames: {
              'walk-0.png': {
                frame: { x: 0, y: 0, w: 32, h: 32 },
                sourceSize: { w: 32, h: 32 },
                spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 },
              },
              'walk-1.png': {
                frame: { x: 32, y: 0, w: 32, h: 32 },
                sourceSize: { w: 32, h: 32 },
                spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 },
              },
              'walk-2.png': {
                frame: { x: 64, y: 0, w: 32, h: 32 },
                sourceSize: { w: 32, h: 32 },
                spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 },
              },
              'walk-3.png': {
                frame: { x: 96, y: 0, w: 32, h: 32 },
                sourceSize: { w: 32, h: 32 },
                spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 },
              },
            },
            meta: {
              image: 'atlas.png',
              format: 'RGBA8888',
              size: { w: 128, h: 32 },
              scale: 1,
            },
            animations: {
              walk: ['walk-0.png', 'walk-1.png', 'walk-2.png', 'walk-3.png'],
            },
          };
        }
        return Texture.EMPTY;
      });

    spritesheetParseSpy = jest
      .spyOn(Spritesheet.prototype, 'parse')
      .mockImplementation(async function (this: Spritesheet): Promise<Record<string, Texture>> {
        const textures = createFrameTextures([
          'walk-0.png',
          'walk-1.png',
          'walk-2.png',
          'walk-3.png',
        ]);
        this.textures = textures;
        return textures;
      });

    manager = new AnimationManager(layerManager);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    assetsLoadSpy.mockRestore();
    spritesheetParseSpy.mockRestore();
    entitiesLayer.destroy({ children: true });
  });

  async function loadWalkSpritesheet(): Promise<void> {
    await manager.loadSpritesheet(SPRITESHEET_KEY, SPRITESHEET_CONFIG);
    manager.defineClip(SPRITESHEET_KEY, WALK_CLIP);
    manager.defineClip(SPRITESHEET_KEY, IDLE_CLIP);
  }

  async function createWalkSprite(
    overrides: Partial<AnimatedSpriteConfig> = {}
  ): Promise<string> {
    return manager.createAnimatedSprite({
      spritesheetKey: SPRITESHEET_KEY,
      initialClip: 'walk',
      layerName: 'entities',
      ...overrides,
    });
  }

  describe('loadSpritesheet', () => {
    it('loads texture and JSON, parses the Spritesheet, and registers it', async () => {
      await manager.loadSpritesheet(SPRITESHEET_KEY, SPRITESHEET_CONFIG);

      expect(assetsLoadSpy).toHaveBeenCalledWith(SPRITESHEET_CONFIG.textureUrl);
      expect(assetsLoadSpy).toHaveBeenCalledWith(SPRITESHEET_CONFIG.dataUrl);
      expect(spritesheetParseSpy).toHaveBeenCalled();
      expect(manager.hasSpritesheet(SPRITESHEET_KEY)).toBe(true);
    });

    it('warns and skips when the same spritesheet key is loaded twice', async () => {
      await manager.loadSpritesheet(SPRITESHEET_KEY, SPRITESHEET_CONFIG);
      spritesheetParseSpy.mockClear();
      await manager.loadSpritesheet(SPRITESHEET_KEY, SPRITESHEET_CONFIG);
      expect(warnSpy).toHaveBeenCalled();
      expect(spritesheetParseSpy).not.toHaveBeenCalled();
    });
  });

  describe('createAnimatedSprite', () => {
    it('creates an AnimatedSprite from the clip and attaches it to the layer', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite({ x: 100, y: 200, scale: 2 });

      const sprite = manager.getAnimatedSprite(id);
      expect(sprite).toBeInstanceOf(AnimatedSprite);
      expect(sprite?.parent).toBe(entitiesLayer);
      expect(entitiesLayer.children).toContain(sprite);
      expect(sprite?.x).toBe(100);
      expect(sprite?.y).toBe(200);
      expect(sprite?.scale.x).toBe(2);
      expect(sprite?.loop).toBe(true);
    });

    it('auto-plays when autoPlay is true and reflects that in state', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite({ autoPlay: true });
      const state = manager.getAnimationState(id);
      expect(state?.isPlaying).toBe(true);
      expect(state?.currentClip).toBe('walk');
      expect(state?.currentFrame).toBe(0);
    });

    it('throws when the spritesheet is not loaded', async () => {
      await expect(
        createWalkSprite({ spritesheetKey: 'missing' })
      ).rejects.toThrow(/spritesheet "missing" is not loaded/);
    });

    it('throws when the target layer does not exist', async () => {
      await loadWalkSpritesheet();
      await expect(createWalkSprite({ layerName: 'nope' })).rejects.toThrow(
        /layer "nope" does not exist/
      );
    });

    it('throws when the initial clip is not defined', async () => {
      await manager.loadSpritesheet(SPRITESHEET_KEY, SPRITESHEET_CONFIG);
      await expect(createWalkSprite()).rejects.toThrow(
        /clip "walk" is not defined/
      );
    });
  });

  describe('playAnimation', () => {
    it('calls play() on the sprite and updates state to playing', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite();

      const sprite = manager.getAnimatedSprite(id)!;
      const playSpy = jest.spyOn(sprite, 'play');

      manager.playAnimation(id);

      expect(playSpy).toHaveBeenCalled();
      const state = manager.getAnimationState(id);
      expect(state?.isPlaying).toBe(true);
      expect(state?.isPaused).toBe(false);
    });

    it('switches clip when a different clipName is provided', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite();

      const sprite = manager.getAnimatedSprite(id)!;
      const gotoAndStopSpy = jest.spyOn(sprite, 'gotoAndStop');
      const playSpy = jest.spyOn(sprite, 'play');

      manager.playAnimation(id, 'idle');

      expect(gotoAndStopSpy).toHaveBeenCalledWith(0);
      expect(playSpy).toHaveBeenCalled();
      expect(sprite.loop).toBe(false);
      const state = manager.getAnimationState(id);
      expect(state?.currentClip).toBe('idle');
      expect(state?.currentFrame).toBe(0);
      expect(state?.isPlaying).toBe(true);
    });

    it('warns when the animated sprite id is unknown', () => {
      manager.playAnimation('missing');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('warns when switching to an unknown clip', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite();
      manager.playAnimation(id, 'flap');
      expect(warnSpy).toHaveBeenCalled();
      expect(manager.getAnimationState(id)?.currentClip).toBe('walk');
    });
  });

  describe('pauseAnimation', () => {
    it('stops the sprite, preserves the current frame, and marks state paused', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite({ autoPlay: true });
      const sprite = manager.getAnimatedSprite(id)!;
      const stopSpy = jest.spyOn(sprite, 'stop');
      Object.defineProperty(sprite, 'currentFrame', { value: 2, configurable: true });

      manager.pauseAnimation(id);

      expect(stopSpy).toHaveBeenCalled();
      const state = manager.getAnimationState(id);
      expect(state?.isPlaying).toBe(false);
      expect(state?.isPaused).toBe(true);
      expect(state?.currentFrame).toBe(2);
    });

    it('warns when the animated sprite id is unknown', () => {
      manager.pauseAnimation('missing');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('stopAnimation', () => {
    it('stops and resets to frame 0', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite({ autoPlay: true });
      const sprite = manager.getAnimatedSprite(id)!;
      const stopSpy = jest.spyOn(sprite, 'stop');
      const gotoAndStopSpy = jest.spyOn(sprite, 'gotoAndStop');

      manager.stopAnimation(id);

      expect(stopSpy).toHaveBeenCalled();
      expect(gotoAndStopSpy).toHaveBeenCalledWith(0);
      const state = manager.getAnimationState(id);
      expect(state?.isPlaying).toBe(false);
      expect(state?.isPaused).toBe(false);
      expect(state?.currentFrame).toBe(0);
    });

    it('warns when the animated sprite id is unknown', () => {
      manager.stopAnimation('missing');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('setAnimationSpeed', () => {
    it('updates the sprite animationSpeed', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite();
      const sprite = manager.getAnimatedSprite(id)!;

      manager.setAnimationSpeed(id, 0.5);

      expect(sprite.animationSpeed).toBe(0.5);
    });

    it('ignores non-finite or non-positive speeds with a warning', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite();
      const sprite = manager.getAnimatedSprite(id)!;
      const priorSpeed = sprite.animationSpeed;

      manager.setAnimationSpeed(id, 0);
      manager.setAnimationSpeed(id, Number.NaN);
      manager.setAnimationSpeed(id, -1);

      expect(sprite.animationSpeed).toBe(priorSpeed);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('warns when the animated sprite id is unknown', () => {
      manager.setAnimationSpeed('missing', 1);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('removeAnimatedSprite', () => {
    it('removes the sprite from its layer and forgets its state', async () => {
      await loadWalkSpritesheet();
      const id = await createWalkSprite();
      const sprite = manager.getAnimatedSprite(id);
      expect(entitiesLayer.children).toContain(sprite);

      const removed = manager.removeAnimatedSprite(id);

      expect(removed).toBe(true);
      expect(manager.getAnimatedSprite(id)).toBeUndefined();
      expect(manager.getAnimationState(id)).toBeUndefined();
      expect(entitiesLayer.children).not.toContain(sprite);
    });

    it('returns false and warns when the id is unknown', () => {
      expect(manager.removeAnimatedSprite('missing')).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('destroys all animated sprites and empties tracking', async () => {
      await loadWalkSpritesheet();
      await createWalkSprite();
      await createWalkSprite();
      expect(manager.getAnimatedSpriteCount()).toBe(2);

      manager.clear();

      expect(manager.getAnimatedSpriteCount()).toBe(0);
      expect(entitiesLayer.children).toHaveLength(0);
    });
  });
});
