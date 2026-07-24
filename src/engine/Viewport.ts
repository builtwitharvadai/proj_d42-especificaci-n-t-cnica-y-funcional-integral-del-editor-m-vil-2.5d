import type { ViewportState } from '@/types/engine.types';

/** Callback invoked whenever the viewport state changes. */
export type ViewportChangeListener = (state: ViewportState) => void;

/** Minimum allowed zoom scale. */
export const MIN_SCALE = 0.5;
/** Maximum allowed zoom scale. */
export const MAX_SCALE = 3.0;

/**
 * Viewport manages the camera transform (pan + zoom) that is applied
 * to the world content. Consumers can subscribe to state changes via
 * {@link Viewport.onChange}.
 */
export class Viewport {
  private state: ViewportState;
  private readonly listeners: Set<ViewportChangeListener> = new Set();

  constructor(initial?: Partial<ViewportState>) {
    this.state = {
      offsetX: initial?.offsetX ?? 0,
      offsetY: initial?.offsetY ?? 0,
      scale: Viewport.clampScale(initial?.scale ?? 1),
    };
  }

  /** Snapshot of the current viewport state (returns a copy). */
  public getState(): ViewportState {
    return { ...this.state };
  }

  /** Move the camera by the given screen-space delta (pixels). */
  public pan(deltaX: number, deltaY: number): void {
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
      throw new Error(
        `Viewport.pan: deltas must be finite numbers (got ${deltaX}, ${deltaY})`
      );
    }
    this.state = {
      ...this.state,
      offsetX: this.state.offsetX + deltaX,
      offsetY: this.state.offsetY + deltaY,
    };
    this.emitChange();
  }

  /** Set the zoom scale, clamped to `[MIN_SCALE, MAX_SCALE]`. */
  public setScale(scale: number): void {
    if (!Number.isFinite(scale)) {
      throw new Error(`Viewport.setScale: scale must be a finite number, got ${scale}`);
    }
    const clamped = Viewport.clampScale(scale);
    if (clamped === this.state.scale) {
      return;
    }
    this.state = { ...this.state, scale: clamped };
    this.emitChange();
  }

  /** Reset viewport to origin with scale 1. */
  public reset(): void {
    this.state = { offsetX: 0, offsetY: 0, scale: 1 };
    this.emitChange();
  }

  /** Register a listener for state changes. Returns an unsubscribe fn. */
  public onChange(listener: ViewportChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private static clampScale(scale: number): number {
    if (scale < MIN_SCALE) return MIN_SCALE;
    if (scale > MAX_SCALE) return MAX_SCALE;
    return scale;
  }
}
