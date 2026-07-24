import { Sprite } from 'pixi.js';
import { TextureCache } from '@/engine/TextureCache';
import { LayerManager } from '@/engine/LayerManager';
import type {
  SpriteConfig,
  SpriteId,
  SpriteMetadata,
} from '@/types/sprite.types';

/**
 * SpriteManager creates, tracks, updates, and destroys {@link Sprite} instances
 * across the layered scene managed by a {@link LayerManager}. It resolves
 * textures through a {@link TextureCache}, so a sprite can be created from
 * only a texture key without the caller having to touch PixiJS directly.
 */
export class SpriteManager {
  private readonly sprites: Map<SpriteId, Sprite>;
  private readonly spriteConfigs: Map<SpriteId, SpriteMetadata>;
  private readonly textureCache: TextureCache;
  private readonly layerManager: LayerManager;
  private nextId: number;

  constructor(textureCache: TextureCache, layerManager: LayerManager) {
    this.textureCache = textureCache;
    this.layerManager = layerManager;
    this.sprites = new Map<SpriteId, Sprite>();
    this.spriteConfigs = new Map<SpriteId, SpriteMetadata>();
    this.nextId = 1;
  }

  /**
   * Create a new sprite. The referenced texture is loaded (or fetched from the
   * cache) and the sprite is attached to the requested layer. Returns the
   * generated {@link SpriteId} that can be used to update or remove it later.
   *
   * Throws when the target layer does not exist.
   */
  public async createSprite(config: SpriteConfig): Promise<SpriteId> {
    const layer = this.layerManager.getLayer(config.layerName);
    if (!layer) {
      throw new Error(
        `[SpriteManager] Cannot create sprite: layer "${config.layerName}" does not exist.`
      );
    }

    const texture = await this.textureCache.loadTexture({
      key: config.textureKey,
      url: config.textureKey,
    });

    const sprite = new Sprite(texture);
    const x = config.x ?? 0;
    const y = config.y ?? 0;
    const scale = config.scale ?? 1;
    const rotation = config.rotation ?? 0;
    const visible = config.visible ?? true;

    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(scale);
    sprite.rotation = rotation;
    sprite.visible = visible;

    const id = this.generateId();
    sprite.label = id;
    layer.addChild(sprite);
    this.sprites.set(id, sprite);
    this.spriteConfigs.set(id, {
      id,
      textureKey: config.textureKey,
      layerName: config.layerName,
      x,
      y,
      scale,
      rotation,
      visible,
    });

    return id;
  }

  /**
   * Remove a sprite by id. Detaches it from its layer, destroys the Pixi
   * resources, and forgets the metadata. Returns true when the sprite was
   * removed, false when no such sprite existed.
   */
  public removeSprite(id: SpriteId): boolean {
    const sprite = this.sprites.get(id);
    if (!sprite) {
      // eslint-disable-next-line no-console
      console.warn(`[SpriteManager] Cannot remove unknown sprite "${id}".`);
      return false;
    }

    const metadata = this.spriteConfigs.get(id);
    if (metadata) {
      const layer = this.layerManager.getLayer(metadata.layerName);
      if (layer && sprite.parent === layer) {
        layer.removeChild(sprite);
      } else if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
    } else if (sprite.parent) {
      sprite.parent.removeChild(sprite);
    }

    sprite.destroy({ children: true });
    this.sprites.delete(id);
    this.spriteConfigs.delete(id);
    return true;
  }

  /**
   * Update a subset of a sprite's properties. Any provided property overrides
   * the corresponding value; unspecified properties are left unchanged.
   * Returns true when the sprite exists and has been updated, false otherwise.
   *
   * Changing `layerName` re-parents the sprite; changing `textureKey` reloads
   * the texture through the {@link TextureCache}.
   */
  public async updateSprite(
    id: SpriteId,
    updates: Partial<SpriteConfig>
  ): Promise<boolean> {
    const sprite = this.sprites.get(id);
    const metadata = this.spriteConfigs.get(id);
    if (!sprite || !metadata) {
      // eslint-disable-next-line no-console
      console.warn(`[SpriteManager] Cannot update unknown sprite "${id}".`);
      return false;
    }

    if (updates.layerName !== undefined && updates.layerName !== metadata.layerName) {
      const nextLayer = this.layerManager.getLayer(updates.layerName);
      if (!nextLayer) {
        // eslint-disable-next-line no-console
        console.warn(
          `[SpriteManager] Cannot move sprite "${id}" to unknown layer "${updates.layerName}".`
        );
        return false;
      }
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      nextLayer.addChild(sprite);
      metadata.layerName = updates.layerName;
    }

    if (updates.textureKey !== undefined && updates.textureKey !== metadata.textureKey) {
      const texture = await this.textureCache.loadTexture({
        key: updates.textureKey,
        url: updates.textureKey,
      });
      sprite.texture = texture;
      metadata.textureKey = updates.textureKey;
    }

    if (updates.x !== undefined) {
      sprite.x = updates.x;
      metadata.x = updates.x;
    }
    if (updates.y !== undefined) {
      sprite.y = updates.y;
      metadata.y = updates.y;
    }
    if (updates.scale !== undefined) {
      sprite.scale.set(updates.scale);
      metadata.scale = updates.scale;
    }
    if (updates.rotation !== undefined) {
      sprite.rotation = updates.rotation;
      metadata.rotation = updates.rotation;
    }
    if (updates.visible !== undefined) {
      sprite.visible = updates.visible;
      metadata.visible = updates.visible;
    }

    return true;
  }

  /** Look up a sprite by id. Returns undefined when it does not exist. */
  public getSprite(id: SpriteId): Sprite | undefined {
    return this.sprites.get(id);
  }

  /** Snapshot of metadata for every managed sprite. */
  public getAllSprites(): SpriteMetadata[] {
    return Array.from(this.spriteConfigs.values()).map((metadata) => ({
      ...metadata,
    }));
  }

  /** Total number of sprites currently managed. */
  public getSpriteCount(): number {
    return this.sprites.size;
  }

  /** Destroy every sprite and clear internal tracking. */
  public clear(): void {
    this.sprites.forEach((sprite, id) => {
      const metadata = this.spriteConfigs.get(id);
      const layer = metadata ? this.layerManager.getLayer(metadata.layerName) : undefined;
      if (layer && sprite.parent === layer) {
        layer.removeChild(sprite);
      } else if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.destroy({ children: true });
    });
    this.sprites.clear();
    this.spriteConfigs.clear();
  }

  private generateId(): SpriteId {
    const id: SpriteId = `sprite-${this.nextId}`;
    this.nextId += 1;
    return id;
  }
}
