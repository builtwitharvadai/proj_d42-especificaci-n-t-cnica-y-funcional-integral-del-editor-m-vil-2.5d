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

    // Demo: load a placeholder spritesheet and create an animated sprite.
    // The Unsplash image is a stand-in for a real 128x32 walk-cycle atlas —
    // a production build would ship a purpose-designed spritesheet asset.
    const animationManager = engine.getAnimationManager();
    let animatedSpriteId: string | undefined;
    try {
      await animationManager.loadSpritesheet('test-walk', {
        textureUrl:
          'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=128&h=32&fit=crop',
        dataUrl: '/assets/test-spritesheet.json',
      });
      animationManager.defineClip('test-walk', {
        name: 'walk',
        frames: ['walk-0.png', 'walk-1.png', 'walk-2.png', 'walk-3.png'],
        frameRate: 8,
        loop: true,
      });
      animatedSpriteId = await animationManager.createAnimatedSprite({
        spritesheetKey: 'test-walk',
        initialClip: 'walk',
        layerName: DefaultLayers.Entities,
        x: 300,
        y: 200,
        scale: 2,
        autoPlay: true,
      });
      // eslint-disable-next-line no-console
      console.log('Animated sprite id:', animatedSpriteId);
      // eslint-disable-next-line no-console
      console.log(
        'Animation state:',
        animationManager.getAnimationState(animatedSpriteId)
      );
    } catch (animationError) {
      // eslint-disable-next-line no-console
      console.warn('Animated sprite demo skipped:', animationError);
    }

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
