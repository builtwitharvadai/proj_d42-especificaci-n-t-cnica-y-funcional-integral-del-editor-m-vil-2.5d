import { Container } from 'pixi.js';
import { LayerManager } from '@/engine/LayerManager';
import {
  DEFAULT_LAYER_CONFIGS,
  DefaultLayers,
  type LayerConfig,
} from '@/types/layer.types';

describe('LayerManager', () => {
  let parent: Container;
  let manager: LayerManager;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    parent = new Container();
    manager = new LayerManager(parent);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    parent.destroy({ children: true });
  });

  describe('constructor', () => {
    it('enables sortableChildren on the parent container', () => {
      const container = new Container();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mgr = new LayerManager(container);
      expect(container.sortableChildren).toBe(true);
      container.destroy({ children: true });
    });
  });

  describe('createLayer', () => {
    it('adds the layer to the internal map and parent container', () => {
      const config: LayerConfig = { name: 'test', zIndex: 5 };
      const addChildSpy = jest.spyOn(parent, 'addChild');

      const layer = manager.createLayer(config);

      expect(layer).toBeInstanceOf(Container);
      expect(layer.zIndex).toBe(5);
      expect(layer.visible).toBe(true);
      expect(addChildSpy).toHaveBeenCalledWith(layer);
      expect(manager.getLayer('test')).toBe(layer);
    });

    it('honours the visible flag when provided', () => {
      const layer = manager.createLayer({ name: 'hidden', zIndex: 1, visible: false });
      expect(layer.visible).toBe(false);
    });

    it('logs a warning and returns the existing layer when the name is duplicated', () => {
      const first = manager.createLayer({ name: 'dup', zIndex: 1 });
      const second = manager.createLayer({ name: 'dup', zIndex: 99 });

      expect(second).toBe(first);
      expect(second.zIndex).toBe(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Layer "dup" already exists')
      );
    });
  });

  describe('getLayer', () => {
    it('retrieves the correct layer by name', () => {
      const layer = manager.createLayer({ name: 'foo', zIndex: 3 });
      expect(manager.getLayer('foo')).toBe(layer);
    });

    it('returns undefined for an unknown layer', () => {
      expect(manager.getLayer('missing')).toBeUndefined();
    });
  });

  describe('removeLayer', () => {
    it('removes the layer from the map and destroys the container', () => {
      const layer = manager.createLayer({ name: 'gone', zIndex: 2 });
      const destroySpy = jest.spyOn(layer, 'destroy');
      const removeChildSpy = jest.spyOn(parent, 'removeChild');

      const result = manager.removeLayer('gone');

      expect(result).toBe(true);
      expect(removeChildSpy).toHaveBeenCalledWith(layer);
      expect(destroySpy).toHaveBeenCalledWith({ children: true });
      expect(manager.getLayer('gone')).toBeUndefined();
    });

    it('returns false and warns when removing a non-existent layer', () => {
      const result = manager.removeLayer('nope');
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot remove unknown layer "nope"')
      );
    });
  });

  describe('setLayerVisibility', () => {
    it('toggles the visibility of an existing layer', () => {
      const layer = manager.createLayer({ name: 'vis', zIndex: 1 });
      expect(layer.visible).toBe(true);

      manager.setLayerVisibility('vis', false);
      expect(layer.visible).toBe(false);

      manager.setLayerVisibility('vis', true);
      expect(layer.visible).toBe(true);
    });

    it('warns when the layer does not exist', () => {
      manager.setLayerVisibility('ghost', false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot set visibility on unknown layer "ghost"')
      );
    });
  });

  describe('getAllLayers', () => {
    it('returns metadata for every layer, sorted by z-index', () => {
      manager.createLayer({ name: 'high', zIndex: 100 });
      manager.createLayer({ name: 'low', zIndex: 1 });
      const mid = manager.createLayer({ name: 'mid', zIndex: 10 });
      mid.addChild(new Container());
      mid.addChild(new Container());

      const metadata = manager.getAllLayers();

      expect(metadata).toHaveLength(3);
      expect(metadata.map((m) => m.name)).toEqual(['low', 'mid', 'high']);
      expect(metadata[1]).toEqual({
        name: 'mid',
        zIndex: 10,
        visible: true,
        spriteCount: 2,
      });
    });
  });

  describe('initializeDefaultLayers', () => {
    it('creates background, entities, and ui layers', () => {
      manager.initializeDefaultLayers();

      expect(manager.getLayer(DefaultLayers.Background)).toBeInstanceOf(Container);
      expect(manager.getLayer(DefaultLayers.Entities)).toBeInstanceOf(Container);
      expect(manager.getLayer(DefaultLayers.UI)).toBeInstanceOf(Container);

      const meta = manager.getAllLayers();
      expect(meta.map((m) => m.name)).toEqual([
        DefaultLayers.Background,
        DefaultLayers.Entities,
        DefaultLayers.UI,
      ]);
      expect(meta.map((m) => m.zIndex)).toEqual(
        DEFAULT_LAYER_CONFIGS.map((c) => c.zIndex)
      );
    });

    it('skips creation when default layers already exist', () => {
      manager.initializeDefaultLayers();
      manager.initializeDefaultLayers();
      expect(manager.getAllLayers()).toHaveLength(DEFAULT_LAYER_CONFIGS.length);
    });
  });

  describe('z-order sorting', () => {
    it('sorts parent container children by zIndex after each mutation', () => {
      const sortSpy = jest.spyOn(parent, 'sortChildren');

      const top = manager.createLayer({ name: 'top', zIndex: 100 });
      const bottom = manager.createLayer({ name: 'bottom', zIndex: 0 });
      const middle = manager.createLayer({ name: 'middle', zIndex: 50 });

      expect(sortSpy).toHaveBeenCalled();

      parent.sortChildren();
      const ordered = parent.children.slice().sort((a, b) => a.zIndex - b.zIndex);
      expect(ordered[0]).toBe(bottom);
      expect(ordered[1]).toBe(middle);
      expect(ordered[2]).toBe(top);
    });
  });
});
