import { Container, Sprite, Texture } from 'pixi.js';
import { SpriteManager } from '@/engine/SpriteManager';
import { TextureCache } from '@/engine/TextureCache';
import { LayerManager } from '@/engine/LayerManager';
import type { SpriteConfig } from '@/types/sprite.types';

jest.mock('@/engine/TextureCache');
jest.mock('@/engine/LayerManager');

const MockedTextureCache = TextureCache as jest.MockedClass<typeof TextureCache>;
const MockedLayerManager = LayerManager as jest.MockedClass<typeof LayerManager>;

function createTexture(): Texture {
  return Texture.EMPTY;
}

describe('SpriteManager', () => {
  let textureCache: jest.Mocked<TextureCache>;
  let layerManager: jest.Mocked<LayerManager>;
  let entitiesLayer: Container;
  let backgroundLayer: Container;
  let manager: SpriteManager;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    MockedTextureCache.mockClear();
    MockedLayerManager.mockClear();

    entitiesLayer = new Container();
    backgroundLayer = new Container();

    textureCache = new MockedTextureCache() as jest.Mocked<TextureCache>;
    layerManager = new MockedLayerManager(new Container()) as jest.Mocked<LayerManager>;

    textureCache.loadTexture = jest.fn().mockResolvedValue(createTexture());
    layerManager.getLayer = jest.fn().mockImplementation((name: string) => {
      if (name === 'entities') return entitiesLayer;
      if (name === 'background') return backgroundLayer;
      return undefined;
    });

    manager = new SpriteManager(textureCache, layerManager);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    entitiesLayer.destroy({ children: true });
    backgroundLayer.destroy({ children: true });
  });

  describe('createSprite', () => {
    it('creates a sprite with the given config and attaches it to the target layer', async () => {
      const config: SpriteConfig = {
        textureKey: 'hero',
        layerName: 'entities',
        x: 42,
        y: 24,
        scale: 2,
        rotation: 0.5,
        visible: true,
      };

      const id = await manager.createSprite(config);

      expect(id).toBeDefined();
      const sprite = manager.getSprite(id);
      expect(sprite).toBeInstanceOf(Sprite);
      expect(sprite?.parent).toBe(entitiesLayer);
      expect(sprite?.x).toBe(42);
      expect(sprite?.y).toBe(24);
      expect(sprite?.scale.x).toBe(2);
      expect(sprite?.scale.y).toBe(2);
      expect(sprite?.rotation).toBe(0.5);
      expect(sprite?.visible).toBe(true);
      expect(entitiesLayer.children).toContain(sprite);
    });

    it('loads the texture via the injected TextureCache', async () => {
      await manager.createSprite({ textureKey: 'hero', layerName: 'entities' });

      expect(textureCache.loadTexture).toHaveBeenCalledWith({
        key: 'hero',
        url: 'hero',
      });
    });

    it('applies default values when optional properties are omitted', async () => {
      const id = await manager.createSprite({
        textureKey: 'hero',
        layerName: 'entities',
      });

      const sprite = manager.getSprite(id);
      expect(sprite?.x).toBe(0);
      expect(sprite?.y).toBe(0);
      expect(sprite?.scale.x).toBe(1);
      expect(sprite?.rotation).toBe(0);
      expect(sprite?.visible).toBe(true);
    });

    it('throws when the target layer does not exist', async () => {
      await expect(
        manager.createSprite({ textureKey: 'hero', layerName: 'nope' })
      ).rejects.toThrow(/layer "nope" does not exist/);
    });
  });

  describe('removeSprite', () => {
    it('removes the sprite from its layer and forgets it', async () => {
      const id = await manager.createSprite({
        textureKey: 'hero',
        layerName: 'entities',
      });
      const sprite = manager.getSprite(id);
      expect(entitiesLayer.children).toContain(sprite);

      const removed = manager.removeSprite(id);
      expect(removed).toBe(true);
      expect(manager.getSprite(id)).toBeUndefined();
      expect(entitiesLayer.children).not.toContain(sprite);
    });

    it('returns false when the sprite id is unknown', () => {
      expect(manager.removeSprite('missing')).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('updateSprite', () => {
    it('updates position, scale, rotation, and visibility', async () => {
      const id = await manager.createSprite({
        textureKey: 'hero',
        layerName: 'entities',
      });

      const ok = await manager.updateSprite(id, {
        x: 10,
        y: 20,
        scale: 3,
        rotation: 1.5,
        visible: false,
      });

      expect(ok).toBe(true);
      const sprite = manager.getSprite(id);
      expect(sprite?.x).toBe(10);
      expect(sprite?.y).toBe(20);
      expect(sprite?.scale.x).toBe(3);
      expect(sprite?.rotation).toBe(1.5);
      expect(sprite?.visible).toBe(false);
    });

    it('re-parents the sprite when the layer changes', async () => {
      const id = await manager.createSprite({
        textureKey: 'hero',
        layerName: 'entities',
      });
      const sprite = manager.getSprite(id);

      await manager.updateSprite(id, { layerName: 'background' });

      expect(sprite?.parent).toBe(backgroundLayer);
      expect(entitiesLayer.children).not.toContain(sprite);
      expect(backgroundLayer.children).toContain(sprite);
    });

    it('returns false when the sprite id is unknown', async () => {
      const ok = await manager.updateSprite('missing', { x: 1 });
      expect(ok).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('getSprite', () => {
    it('returns the sprite for a known id', async () => {
      const id = await manager.createSprite({
        textureKey: 'hero',
        layerName: 'entities',
      });
      expect(manager.getSprite(id)).toBeInstanceOf(Sprite);
    });

    it('returns undefined for an unknown id', () => {
      expect(manager.getSprite('nope')).toBeUndefined();
    });
  });

  describe('getAllSprites', () => {
    it('returns metadata for every managed sprite', async () => {
      const id1 = await manager.createSprite({
        textureKey: 'hero',
        layerName: 'entities',
        x: 10,
      });
      const id2 = await manager.createSprite({
        textureKey: 'bg',
        layerName: 'background',
        y: 20,
      });

      const all = manager.getAllSprites();
      expect(all).toHaveLength(2);
      const byId = new Map(all.map((m) => [m.id, m]));
      expect(byId.get(id1)?.textureKey).toBe('hero');
      expect(byId.get(id1)?.layerName).toBe('entities');
      expect(byId.get(id1)?.x).toBe(10);
      expect(byId.get(id2)?.textureKey).toBe('bg');
      expect(byId.get(id2)?.layerName).toBe('background');
      expect(byId.get(id2)?.y).toBe(20);
    });

    it('returns an empty list when no sprites are managed', () => {
      expect(manager.getAllSprites()).toEqual([]);
    });
  });
});
