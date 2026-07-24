import { Assets, Texture } from 'pixi.js';
import { TextureCache } from '@/engine/TextureCache';

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

function createMockTexture(): Texture {
  const texture = {
    destroy: jest.fn(),
  } as unknown as Texture;
  return texture;
}

describe('TextureCache', () => {
  let cache: TextureCache;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockedAssets.load.mockReset();
    cache = new TextureCache();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('loadTexture', () => {
    it('loads a texture via Assets.load and caches it', async () => {
      const texture = createMockTexture();
      mockedAssets.load.mockResolvedValueOnce(texture);

      const result = await cache.loadTexture({ key: 'hero', url: 'hero.png' });

      expect(mockedAssets.load).toHaveBeenCalledWith('hero.png');
      expect(mockedAssets.load).toHaveBeenCalledTimes(1);
      expect(result).toBe(texture);
      expect(cache.hasTexture('hero')).toBe(true);
    });

    it('returns the cached texture on subsequent calls without re-loading', async () => {
      const texture = createMockTexture();
      mockedAssets.load.mockResolvedValueOnce(texture);

      const first = await cache.loadTexture({ key: 'hero', url: 'hero.png' });
      const second = await cache.loadTexture({ key: 'hero', url: 'hero.png' });

      expect(first).toBe(second);
      expect(mockedAssets.load).toHaveBeenCalledTimes(1);
    });

    it('returns the placeholder texture and logs a warning when loading fails', async () => {
      mockedAssets.load.mockRejectedValueOnce(new Error('network fail'));

      const result = await cache.loadTexture({ key: 'broken', url: 'broken.png' });

      expect(result).toBe(cache.getPlaceholderTexture());
      expect(cache.hasTexture('broken')).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('getTexture', () => {
    it('returns the cached texture for a known key', async () => {
      const texture = createMockTexture();
      mockedAssets.load.mockResolvedValueOnce(texture);
      await cache.loadTexture({ key: 'hero', url: 'hero.png' });

      expect(cache.getTexture('hero')).toBe(texture);
    });

    it('returns undefined for an unknown key', () => {
      expect(cache.getTexture('missing')).toBeUndefined();
    });
  });

  describe('hasTexture', () => {
    it('returns true when the key is cached', async () => {
      mockedAssets.load.mockResolvedValueOnce(createMockTexture());
      await cache.loadTexture({ key: 'hero', url: 'hero.png' });

      expect(cache.hasTexture('hero')).toBe(true);
    });

    it('returns false when the key is not cached', () => {
      expect(cache.hasTexture('nope')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('destroys every cached texture and empties the cache', async () => {
      const first = createMockTexture();
      const second = createMockTexture();
      mockedAssets.load.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

      await cache.loadTexture({ key: 'a', url: 'a.png' });
      await cache.loadTexture({ key: 'b', url: 'b.png' });

      cache.clearCache();

      expect(first.destroy).toHaveBeenCalledWith(true);
      expect(second.destroy).toHaveBeenCalledWith(true);
      expect(cache.hasTexture('a')).toBe(false);
      expect(cache.hasTexture('b')).toBe(false);
      expect(cache.getCacheStats().size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('reports the cache size and the list of keys', async () => {
      mockedAssets.load
        .mockResolvedValueOnce(createMockTexture())
        .mockResolvedValueOnce(createMockTexture());

      await cache.loadTexture({ key: 'a', url: 'a.png' });
      await cache.loadTexture({ key: 'b', url: 'b.png' });

      const stats = cache.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys.sort()).toEqual(['a', 'b']);
    });

    it('returns an empty snapshot when nothing has been cached', () => {
      const stats = cache.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });
});
