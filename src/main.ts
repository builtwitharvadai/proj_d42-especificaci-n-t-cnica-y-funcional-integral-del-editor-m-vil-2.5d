import { CanvasEngine } from '@/engine/CanvasEngine';
import type { EngineConfig } from '@/types/engine.types';
import { DefaultLayers } from '@/types/layer.types';

const engineConfig: EngineConfig = {
  width: 800,
  height: 600,
  backgroundColor: 0x1a1a1a,
  gridCellSize: 32,
};

const engine = new CanvasEngine(engineConfig);

const BACKGROUND_TEXTURE_URL =
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300';
const CHARACTER_TEXTURE_URL =
  'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=200&h=200';

async function init(): Promise<void> {
  try {
    await engine.init();
    document.body.appendChild(engine.getCanvas());

    const spriteManager = engine.getSpriteManager();
    const textureCache = engine.getTextureCache();

    const backgroundSpriteId = await spriteManager.createSprite({
      textureKey: BACKGROUND_TEXTURE_URL,
      layerName: DefaultLayers.Background,
      x: 0,
      y: 0,
      scale: 2,
    });

    const characterSpriteId = await spriteManager.createSprite({
      textureKey: CHARACTER_TEXTURE_URL,
      layerName: DefaultLayers.Entities,
      x: 150,
      y: 150,
      scale: 1,
    });

    // eslint-disable-next-line no-console
    console.log('CanvasEngine initialized successfully');
    // eslint-disable-next-line no-console
    console.log('Background sprite id:', backgroundSpriteId);
    // eslint-disable-next-line no-console
    console.log('Character sprite id:', characterSpriteId);
    // eslint-disable-next-line no-console
    console.log('Texture cache stats:', textureCache.getCacheStats());
    // eslint-disable-next-line no-console
    console.log('Layer metadata:', engine.getLayerManager().getAllLayers());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize CanvasEngine:', error);
  }
}

void init();

export { engine };
