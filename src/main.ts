import { Application } from 'pixi.js';

const app = new Application();

async function init(): Promise<void> {
  await app.init({
    background: '#1a1a2e',
    width: 800,
    height: 600,
    antialias: true,
  });

  document.body.appendChild(app.canvas);

  // eslint-disable-next-line no-console
  console.log('PixiJS application initialized (800x600).');
}

void init();

export { app };
