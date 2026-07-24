import { CanvasEngine } from '@/engine/CanvasEngine';
import type { EngineConfig } from '@/types/engine.types';

const engineConfig: EngineConfig = {
  width: 800,
  height: 600,
  backgroundColor: 0x1a1a1a,
  gridCellSize: 32,
};

const engine = new CanvasEngine(engineConfig);

async function init(): Promise<void> {
  try {
    await engine.init();
    document.body.appendChild(engine.getCanvas());
    // eslint-disable-next-line no-console
    console.log('CanvasEngine initialized successfully');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize CanvasEngine:', error);
  }
}

void init();

export { engine };
