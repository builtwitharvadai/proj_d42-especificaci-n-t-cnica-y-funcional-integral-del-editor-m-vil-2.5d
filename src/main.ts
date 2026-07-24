import { Graphics } from 'pixi.js';
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

function createRect(color: number, width: number, height: number): Graphics {
  const g = new Graphics();
  g.rect(0, 0, width, height).fill({ color });
  return g;
}

async function init(): Promise<void> {
  try {
    await engine.init();
    document.body.appendChild(engine.getCanvas());

    const layerManager = engine.getLayerManager();

    const red = createRect(0xff0000, 50, 50);
    red.position.set(100, 100);
    layerManager.getLayer(DefaultLayers.Background)?.addChild(red);

    const green = createRect(0x00ff00, 50, 50);
    green.position.set(110, 110);
    layerManager.getLayer(DefaultLayers.Entities)?.addChild(green);

    const blue = createRect(0x0000ff, 50, 50);
    blue.position.set(120, 120);
    layerManager.getLayer(DefaultLayers.UI)?.addChild(blue);

    // eslint-disable-next-line no-console
    console.log('CanvasEngine initialized successfully');
    // eslint-disable-next-line no-console
    console.log('Layer metadata:', layerManager.getAllLayers());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize CanvasEngine:', error);
  }
}

void init();

export { engine };
