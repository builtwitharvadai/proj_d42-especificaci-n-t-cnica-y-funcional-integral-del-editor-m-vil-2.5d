import { Assets, Texture } from 'pixi.js';
import type { TextureLoadOptions } from '@/types/sprite.types';

/**
 * TextureCache stores {@link Texture} instances keyed by string so that the
 * same texture can be reused by multiple sprites without re-decoding the
 * image. Textures can be loaded from any URL or `data:` URI supported by
 * PixiJS {@link Assets.load}.
 *
 * If a texture fails to load, a shared 1×1 magenta placeholder is returned
 * so that the caller never has to reason about `undefined` textures.
 */
export class TextureCache {
  private readonly cache: Map<string, Texture>;
  private readonly placeholderTexture: Texture;

  constructor() {
    this.cache = new Map<string, Texture>();
    this.placeholderTexture = this.createPlaceholderTexture();
  }

  /**
   * Load a texture from a URL (or `data:` URI) and store it under the given
   * key. If a texture with the same key is already cached, the cached texture
   * is returned immediately without re-fetching.
   *
   * On failure, a warning is logged and the shared placeholder texture is
   * returned so that rendering can still proceed.
   */
  public async loadTexture(options: TextureLoadOptions): Promise<Texture> {
    const cached = this.cache.get(options.key);
    if (cached) {
      return cached;
    }

    try {
      const texture: Texture = await Assets.load(options.url);
      this.cache.set(options.key, texture);
      return texture;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `[TextureCache] Failed to load texture "${options.key}" from "${options.url}":`,
        error
      );
      return this.placeholderTexture;
    }
  }

  /** Look up a cached texture by key. Returns undefined when missing. */
  public getTexture(key: string): Texture | undefined {
    return this.cache.get(key);
  }

  /** Return true if a texture with the given key is currently cached. */
  public hasTexture(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Destroy every cached texture and clear the cache. The placeholder texture
   * is kept alive so future load failures can still fall back to it.
   */
  public clearCache(): void {
    this.cache.forEach((texture) => {
      try {
        texture.destroy(true);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[TextureCache] Failed to destroy texture during clear:', error);
      }
    });
    this.cache.clear();
  }

  /** Snapshot of the cache size and the set of keys currently stored. */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /** The magenta placeholder returned when a texture fails to load. */
  public getPlaceholderTexture(): Texture {
    return this.placeholderTexture;
  }

  private createPlaceholderTexture(): Texture {
    try {
      const canvas: HTMLCanvasElement = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(0, 0, 1, 1);
      }
      return Texture.from(canvas);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        '[TextureCache] Failed to create placeholder texture, falling back to Texture.EMPTY:',
        error
      );
      return Texture.EMPTY;
    }
  }
}

/** Shared singleton instance for convenient access across the engine. */
export const textureCache = new TextureCache();
