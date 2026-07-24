import { Container } from 'pixi.js';
import {
  DEFAULT_LAYER_CONFIGS,
  DefaultLayers,
  type LayerConfig,
  type LayerMetadata,
} from '@/types/layer.types';

/**
 * LayerManager creates and controls multiple rendering layers attached to a
 * parent {@link Container}. Each layer is a Pixi Container with its own
 * z-index, allowing sprites and UI elements to be rendered in a well-defined
 * stacking order (background → entities → UI).
 */
export class LayerManager {
  private readonly layers: Map<string, Container>;
  private readonly parentContainer: Container;

  constructor(parentContainer: Container) {
    this.parentContainer = parentContainer;
    this.parentContainer.sortableChildren = true;
    this.layers = new Map<string, Container>();
  }

  /**
   * Create a new layer with the given configuration and attach it to the
   * parent container. Returns the created Container, or the existing one if a
   * layer with the same name already exists (a warning is emitted).
   */
  public createLayer(config: LayerConfig): Container {
    const existing = this.layers.get(config.name);
    if (existing) {
      // eslint-disable-next-line no-console
      console.warn(
        `[LayerManager] Layer "${config.name}" already exists; returning existing layer.`
      );
      return existing;
    }

    const layer = new Container();
    layer.label = config.name;
    layer.zIndex = config.zIndex;
    layer.visible = config.visible ?? true;
    layer.sortableChildren = true;

    this.layers.set(config.name, layer);
    this.parentContainer.addChild(layer);
    this.parentContainer.sortChildren();

    return layer;
  }

  /** Look up a layer by name. Returns undefined when the layer does not exist. */
  public getLayer(name: string): Container | undefined {
    return this.layers.get(name);
  }

  /**
   * Remove a layer by name and destroy its Pixi resources (including children).
   * Returns true when a layer was removed, false when no such layer existed.
   */
  public removeLayer(name: string): boolean {
    const layer = this.layers.get(name);
    if (!layer) {
      // eslint-disable-next-line no-console
      console.warn(`[LayerManager] Cannot remove unknown layer "${name}".`);
      return false;
    }

    this.parentContainer.removeChild(layer);
    layer.destroy({ children: true });
    this.layers.delete(name);
    this.parentContainer.sortChildren();
    return true;
  }

  /** Toggle the visibility of a layer identified by name. */
  public setLayerVisibility(name: string, visible: boolean): void {
    const layer = this.layers.get(name);
    if (!layer) {
      // eslint-disable-next-line no-console
      console.warn(
        `[LayerManager] Cannot set visibility on unknown layer "${name}".`
      );
      return;
    }
    layer.visible = visible;
  }

  /** Return metadata snapshots for all managed layers, sorted by z-index ascending. */
  public getAllLayers(): LayerMetadata[] {
    const metadata: LayerMetadata[] = [];
    this.layers.forEach((layer, name) => {
      metadata.push({
        name,
        zIndex: layer.zIndex,
        visible: layer.visible,
        spriteCount: layer.children.length,
      });
    });
    metadata.sort((a, b) => a.zIndex - b.zIndex);
    return metadata;
  }

  /**
   * Create the default set of layers: background, entities, ui.
   * Uses {@link DEFAULT_LAYER_CONFIGS} and skips any layers that already exist.
   */
  public initializeDefaultLayers(): void {
    for (const config of DEFAULT_LAYER_CONFIGS) {
      if (!this.layers.has(config.name)) {
        this.createLayer(config);
      }
    }
  }

  /** Convenience accessor for the well-known background layer. */
  public getBackgroundLayer(): Container | undefined {
    return this.layers.get(DefaultLayers.Background);
  }

  /** Convenience accessor for the well-known entities layer. */
  public getEntitiesLayer(): Container | undefined {
    return this.layers.get(DefaultLayers.Entities);
  }

  /** Convenience accessor for the well-known UI layer. */
  public getUILayer(): Container | undefined {
    return this.layers.get(DefaultLayers.UI);
  }
}
