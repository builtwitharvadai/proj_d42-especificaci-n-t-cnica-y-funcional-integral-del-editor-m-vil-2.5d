/**
 * Configuration used to create a rendering layer.
 */
export interface LayerConfig {
  /** Unique name that identifies the layer. */
  name: string;
  /** Z-index used to order the layer relative to other layers (higher renders on top). */
  zIndex: number;
  /** Whether the layer should be visible when created. Defaults to true. */
  visible?: boolean;
}

/**
 * Metadata describing the current state of a rendering layer.
 */
export interface LayerMetadata {
  /** Unique name of the layer. */
  name: string;
  /** Z-index used to order the layer relative to other layers. */
  zIndex: number;
  /** Whether the layer is currently visible. */
  visible: boolean;
  /** Number of sprites (children) currently attached to the layer. */
  spriteCount: number;
}

/**
 * Enumeration of the default layers created by the {@link LayerManager}.
 */
export enum DefaultLayers {
  Background = 'background',
  Entities = 'entities',
  UI = 'ui',
}

/**
 * Default layer configurations created by the {@link LayerManager} on initialization.
 *
 * The z-indexes ensure a predictable stacking order:
 * - background (0): terrain, tiles, static art
 * - entities (10): interactive sprites, characters
 * - ui (100): HUD, overlays, always-on-top elements
 */
export const DEFAULT_LAYER_CONFIGS: LayerConfig[] = [
  { name: DefaultLayers.Background, zIndex: 0, visible: true },
  { name: DefaultLayers.Entities, zIndex: 10, visible: true },
  { name: DefaultLayers.UI, zIndex: 100, visible: true },
];
