/**
 * Unique identifier for a sprite instance managed by the {@link SpriteManager}.
 */
export type SpriteId = string;

/**
 * Configuration used to create a sprite instance.
 *
 * Only {@link textureKey} and {@link layerName} are required; the remaining
 * properties fall back to sensible defaults (position `(0, 0)`, scale `1`,
 * rotation `0`, and `visible: true`).
 */
export interface SpriteConfig {
  /** Key of a texture already registered in the {@link TextureCache}. */
  textureKey: string;
  /** Name of the layer this sprite should be attached to. */
  layerName: string;
  /** Initial x-coordinate of the sprite (in world units). Defaults to 0. */
  x?: number;
  /** Initial y-coordinate of the sprite (in world units). Defaults to 0. */
  y?: number;
  /** Uniform scale factor. Defaults to 1. */
  scale?: number;
  /** Rotation in radians. Defaults to 0. */
  rotation?: number;
  /** Whether the sprite is visible when created. Defaults to true. */
  visible?: boolean;
}

/**
 * Metadata describing the current state of a sprite instance.
 */
export interface SpriteMetadata {
  /** Unique identifier assigned by the {@link SpriteManager}. */
  id: SpriteId;
  /** Texture key referencing an entry in the {@link TextureCache}. */
  textureKey: string;
  /** Name of the layer this sprite is currently attached to. */
  layerName: string;
  /** Current x-coordinate of the sprite. */
  x: number;
  /** Current y-coordinate of the sprite. */
  y: number;
  /** Current uniform scale factor. */
  scale: number;
  /** Current rotation in radians. */
  rotation: number;
  /** Whether the sprite is currently visible. */
  visible: boolean;
}

/**
 * Options describing how to load a texture into the {@link TextureCache}.
 *
 * The {@link url} may be a network URL or a `data:` URI. The {@link key}
 * is the identifier used to look the texture up later.
 */
export interface TextureLoadOptions {
  /** URL or `data:` URI pointing at the texture image. */
  url: string;
  /** Unique key used to store and retrieve the texture. */
  key: string;
}
