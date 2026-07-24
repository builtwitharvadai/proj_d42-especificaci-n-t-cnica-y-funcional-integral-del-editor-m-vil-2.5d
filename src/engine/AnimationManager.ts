import { AnimatedSprite, Assets, Spritesheet, Texture } from 'pixi.js';
import { LayerManager } from '@/engine/LayerManager';
import type {
  AnimatedSpriteConfig,
  AnimatedSpriteId,
  AnimationClip,
  AnimationState,
  SpritesheetConfig,
} from '@/types/animation.types';

/**
 * AnimationManager loads spritesheets, defines animation clips, and manages
 * PixiJS {@link AnimatedSprite} instances across the layered scene owned by a
 * {@link LayerManager}.
 *
 * A single spritesheet is registered by key and may host multiple clips.
 * Animated sprites are created from a registered spritesheet's clip and are
 * tracked individually so they can be played, paused, stopped, retimed, and
 * destroyed by id.
 */
export class AnimationManager {
  private readonly spritesheets: Map<string, Spritesheet>;
  private readonly clipsBySpritesheet: Map<string, Map<string, AnimationClip>>;
  private readonly animatedSprites: Map<AnimatedSpriteId, AnimatedSprite>;
  private readonly animationStates: Map<AnimatedSpriteId, AnimationState>;
  private readonly spriteSpritesheets: Map<AnimatedSpriteId, string>;
  private readonly layerManager: LayerManager;
  private nextId: number;

  constructor(layerManager: LayerManager) {
    this.layerManager = layerManager;
    this.spritesheets = new Map<string, Spritesheet>();
    this.clipsBySpritesheet = new Map<string, Map<string, AnimationClip>>();
    this.animatedSprites = new Map<AnimatedSpriteId, AnimatedSprite>();
    this.animationStates = new Map<AnimatedSpriteId, AnimationState>();
    this.spriteSpritesheets = new Map<AnimatedSpriteId, string>();
    this.nextId = 1;
  }

  /**
   * Load a spritesheet's texture and JSON descriptor and register it under
   * `key`. Loading the same key twice is a no-op (a warning is emitted).
   *
   * Throws when the texture or JSON descriptor cannot be loaded.
   */
  public async loadSpritesheet(key: string, config: SpritesheetConfig): Promise<void> {
    if (!key) {
      throw new Error('[AnimationManager] Spritesheet key must be a non-empty string.');
    }
    if (this.spritesheets.has(key)) {
      // eslint-disable-next-line no-console
      console.warn(`[AnimationManager] Spritesheet "${key}" already loaded; skipping.`);
      return;
    }

    const texture = (await Assets.load(config.textureUrl)) as Texture;
    if (!texture) {
      throw new Error(
        `[AnimationManager] Failed to load spritesheet texture at "${config.textureUrl}".`
      );
    }

    const data = await Assets.load(config.dataUrl);
    if (!data) {
      throw new Error(
        `[AnimationManager] Failed to load spritesheet data at "${config.dataUrl}".`
      );
    }

    const spritesheet = new Spritesheet(texture, data);
    await spritesheet.parse();

    this.spritesheets.set(key, spritesheet);
    if (!this.clipsBySpritesheet.has(key)) {
      this.clipsBySpritesheet.set(key, new Map<string, AnimationClip>());
    }
  }

  /**
   * Define an animation clip for a previously loaded spritesheet. Overwrites
   * an existing clip with the same name.
   *
   * Throws when the spritesheet is not registered or when the clip references
   * frames that are missing from the atlas.
   */
  public defineClip(spritesheetKey: string, clip: AnimationClip): void {
    const spritesheet = this.spritesheets.get(spritesheetKey);
    if (!spritesheet) {
      throw new Error(
        `[AnimationManager] Cannot define clip on unknown spritesheet "${spritesheetKey}".`
      );
    }
    if (!clip.name) {
      throw new Error('[AnimationManager] Clip name must be a non-empty string.');
    }
    if (!clip.frames || clip.frames.length === 0) {
      throw new Error(
        `[AnimationManager] Clip "${clip.name}" must contain at least one frame.`
      );
    }
    if (clip.frameRate <= 0) {
      throw new Error(
        `[AnimationManager] Clip "${clip.name}" frameRate must be > 0 (got ${clip.frameRate}).`
      );
    }

    for (const frame of clip.frames) {
      if (!spritesheet.textures[frame]) {
        throw new Error(
          `[AnimationManager] Clip "${clip.name}" references missing frame "${frame}".`
        );
      }
    }

    let clips = this.clipsBySpritesheet.get(spritesheetKey);
    if (!clips) {
      clips = new Map<string, AnimationClip>();
      this.clipsBySpritesheet.set(spritesheetKey, clips);
    }
    clips.set(clip.name, clip);
  }

  /**
   * Create a new animated sprite from a spritesheet's clip and attach it to
   * the requested layer. Returns the id assigned by the manager.
   *
   * Throws when the target spritesheet, layer, or clip cannot be resolved.
   */
  public async createAnimatedSprite(
    config: AnimatedSpriteConfig
  ): Promise<AnimatedSpriteId> {
    const spritesheet = this.spritesheets.get(config.spritesheetKey);
    if (!spritesheet) {
      throw new Error(
        `[AnimationManager] Cannot create animated sprite: spritesheet "${config.spritesheetKey}" is not loaded.`
      );
    }

    const layer = this.layerManager.getLayer(config.layerName);
    if (!layer) {
      throw new Error(
        `[AnimationManager] Cannot create animated sprite: layer "${config.layerName}" does not exist.`
      );
    }

    const clip = this.getClip(config.spritesheetKey, config.initialClip);
    if (!clip) {
      throw new Error(
        `[AnimationManager] Cannot create animated sprite: clip "${config.initialClip}" is not defined for spritesheet "${config.spritesheetKey}".`
      );
    }

    const textures = this.resolveClipTextures(spritesheet, clip);
    const sprite = new AnimatedSprite(textures);

    sprite.x = config.x ?? 0;
    sprite.y = config.y ?? 0;
    const scale = config.scale ?? 1;
    sprite.scale.set(scale);
    sprite.loop = clip.loop;
    sprite.animationSpeed = this.computeAnimationSpeed(clip.frameRate);

    const autoPlay = config.autoPlay ?? false;
    if (autoPlay) {
      sprite.play();
    }

    const id = this.generateId();
    sprite.label = id;
    layer.addChild(sprite);

    this.animatedSprites.set(id, sprite);
    this.spriteSpritesheets.set(id, config.spritesheetKey);
    this.animationStates.set(id, {
      currentClip: clip.name,
      isPlaying: autoPlay,
      isPaused: false,
      currentFrame: 0,
    });

    return id;
  }

  /**
   * Play the animation on a sprite. When `clipName` is provided the sprite
   * switches to that clip (must belong to the sprite's spritesheet) before
   * playing. Emits a warning when the sprite is unknown.
   */
  public playAnimation(id: AnimatedSpriteId, clipName?: string): void {
    const sprite = this.animatedSprites.get(id);
    const state = this.animationStates.get(id);
    if (!sprite || !state) {
      // eslint-disable-next-line no-console
      console.warn(`[AnimationManager] Cannot play unknown animated sprite "${id}".`);
      return;
    }

    if (clipName && clipName !== state.currentClip) {
      const spritesheetKey = this.spriteSpritesheets.get(id);
      const spritesheet = spritesheetKey
        ? this.spritesheets.get(spritesheetKey)
        : undefined;
      const clip = spritesheetKey ? this.getClip(spritesheetKey, clipName) : undefined;
      if (!spritesheet || !clip) {
        // eslint-disable-next-line no-console
        console.warn(
          `[AnimationManager] Cannot switch sprite "${id}" to unknown clip "${clipName}".`
        );
        return;
      }
      sprite.textures = this.resolveClipTextures(spritesheet, clip);
      sprite.loop = clip.loop;
      sprite.animationSpeed = this.computeAnimationSpeed(clip.frameRate);
      sprite.gotoAndStop(0);
      state.currentClip = clip.name;
      state.currentFrame = 0;
    }

    sprite.play();
    state.isPlaying = true;
    state.isPaused = false;
  }

  /** Pause playback on a sprite while preserving its current frame. */
  public pauseAnimation(id: AnimatedSpriteId): void {
    const sprite = this.animatedSprites.get(id);
    const state = this.animationStates.get(id);
    if (!sprite || !state) {
      // eslint-disable-next-line no-console
      console.warn(`[AnimationManager] Cannot pause unknown animated sprite "${id}".`);
      return;
    }

    sprite.stop();
    state.currentFrame = sprite.currentFrame;
    state.isPlaying = false;
    state.isPaused = true;
  }

  /** Stop playback on a sprite and reset it to the first frame. */
  public stopAnimation(id: AnimatedSpriteId): void {
    const sprite = this.animatedSprites.get(id);
    const state = this.animationStates.get(id);
    if (!sprite || !state) {
      // eslint-disable-next-line no-console
      console.warn(`[AnimationManager] Cannot stop unknown animated sprite "${id}".`);
      return;
    }

    sprite.stop();
    sprite.gotoAndStop(0);
    state.currentFrame = 0;
    state.isPlaying = false;
    state.isPaused = false;
  }

  /**
   * Directly set the PixiJS animation speed (a multiplier applied to the base
   * playback rate). Values <= 0 are rejected.
   */
  public setAnimationSpeed(id: AnimatedSpriteId, speed: number): void {
    const sprite = this.animatedSprites.get(id);
    if (!sprite) {
      // eslint-disable-next-line no-console
      console.warn(
        `[AnimationManager] Cannot set speed on unknown animated sprite "${id}".`
      );
      return;
    }
    if (!Number.isFinite(speed) || speed <= 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[AnimationManager] Ignoring invalid animation speed ${speed} for sprite "${id}".`
      );
      return;
    }
    sprite.animationSpeed = speed;
  }

  /**
   * Remove an animated sprite: detach it from its layer, destroy its Pixi
   * resources, and forget its state. Returns true when the sprite existed.
   */
  public removeAnimatedSprite(id: AnimatedSpriteId): boolean {
    const sprite = this.animatedSprites.get(id);
    if (!sprite) {
      // eslint-disable-next-line no-console
      console.warn(
        `[AnimationManager] Cannot remove unknown animated sprite "${id}".`
      );
      return false;
    }

    sprite.stop();
    if (sprite.parent) {
      sprite.parent.removeChild(sprite);
    }
    sprite.destroy({ children: true });

    this.animatedSprites.delete(id);
    this.animationStates.delete(id);
    this.spriteSpritesheets.delete(id);
    return true;
  }

  /** Look up an animated sprite by id. */
  public getAnimatedSprite(id: AnimatedSpriteId): AnimatedSprite | undefined {
    return this.animatedSprites.get(id);
  }

  /** Snapshot of an animated sprite's current animation state. */
  public getAnimationState(id: AnimatedSpriteId): AnimationState | undefined {
    const state = this.animationStates.get(id);
    return state ? { ...state } : undefined;
  }

  /** Whether a spritesheet with `key` has been loaded. */
  public hasSpritesheet(key: string): boolean {
    return this.spritesheets.has(key);
  }

  /** Lookup a previously defined clip. */
  public getClip(spritesheetKey: string, clipName: string): AnimationClip | undefined {
    return this.clipsBySpritesheet.get(spritesheetKey)?.get(clipName);
  }

  /** Total number of animated sprites currently managed. */
  public getAnimatedSpriteCount(): number {
    return this.animatedSprites.size;
  }

  /** Destroy every animated sprite and clear all internal state. */
  public clear(): void {
    this.animatedSprites.forEach((sprite) => {
      sprite.stop();
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.destroy({ children: true });
    });
    this.animatedSprites.clear();
    this.animationStates.clear();
    this.spriteSpritesheets.clear();
  }

  private resolveClipTextures(spritesheet: Spritesheet, clip: AnimationClip): Texture[] {
    return clip.frames.map((frame) => {
      const texture = spritesheet.textures[frame];
      if (!texture) {
        throw new Error(
          `[AnimationManager] Frame "${frame}" is missing from the spritesheet.`
        );
      }
      return texture;
    });
  }

  private computeAnimationSpeed(frameRate: number): number {
    return frameRate / 60;
  }

  private generateId(): AnimatedSpriteId {
    const id: AnimatedSpriteId = `anim-${this.nextId}`;
    this.nextId += 1;
    return id;
  }
}
