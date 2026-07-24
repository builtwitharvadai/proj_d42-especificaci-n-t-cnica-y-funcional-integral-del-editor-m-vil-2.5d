/**
 * Unique identifier for an animated sprite instance managed by the
 * {@link AnimationManager}.
 */
export type AnimatedSpriteId = string;

/**
 * Definition of a single animation clip.
 *
 * A clip is an ordered sequence of frame keys (referring to individual
 * textures inside a spritesheet's atlas) played back at {@link frameRate}
 * frames per second. When {@link loop} is `true` the clip restarts from
 * the first frame after the last frame is displayed.
 */
export interface AnimationClip {
  /** Human-readable name used to reference the clip. */
  name: string;
  /** Ordered list of atlas frame keys that make up the animation. */
  frames: string[];
  /** Playback speed of the clip, expressed in frames per second. */
  frameRate: number;
  /** Whether the clip should loop after reaching the last frame. */
  loop: boolean;
}

/**
 * Configuration describing where to find a spritesheet's assets.
 *
 * Both URLs may point to network resources or `data:` URIs. The
 * {@link textureUrl} references the image atlas and the {@link dataUrl}
 * references the JSON descriptor (PixiJS/TexturePacker compatible).
 */
export interface SpritesheetConfig {
  /** URL of the atlas image (PNG, WebP, etc.). */
  textureUrl: string;
  /** URL of the JSON descriptor for the spritesheet. */
  dataUrl: string;
}

/**
 * Runtime state of an animated sprite.
 */
export interface AnimationState {
  /** Name of the animation clip currently assigned to the sprite. */
  currentClip: string;
  /** Whether the animation is actively advancing frames. */
  isPlaying: boolean;
  /** Whether the animation is paused (retains {@link currentFrame}). */
  isPaused: boolean;
  /** Zero-based index of the frame currently displayed. */
  currentFrame: number;
}

/**
 * Configuration used to create an animated sprite instance.
 *
 * The {@link spritesheetKey} references a spritesheet previously registered
 * with the {@link AnimationManager}. The {@link initialClip} must correspond
 * to a clip defined for that spritesheet.
 */
export interface AnimatedSpriteConfig {
  /** Key of a spritesheet already registered with the AnimationManager. */
  spritesheetKey: string;
  /** Name of the clip to assign to the sprite when it is created. */
  initialClip: string;
  /** Name of the layer this animated sprite should be attached to. */
  layerName: string;
  /** Initial x-coordinate (in world units). Defaults to 0. */
  x?: number;
  /** Initial y-coordinate (in world units). Defaults to 0. */
  y?: number;
  /** Uniform scale factor. Defaults to 1. */
  scale?: number;
  /** Whether the sprite should start playing immediately. Defaults to false. */
  autoPlay?: boolean;
}
