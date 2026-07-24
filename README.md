# Especificación Técnica y Funcional Integral del Editor Móvil 2.5D

## Project Overview

A 2.5D mobile game editor built with PixiJS and TypeScript. This project provides a
complete environment for authoring 2.5D content on mobile devices, covering the game
engine architecture, a behavior system with 13 distinct behavior types, combat mechanics
(physical, special, state), and project/scene/layer/timeline management with fine-grained
input controls.

## Tech Stack

- **PixiJS 8.x** — WebGL/WebGPU 2D rendering engine used for scenes, sprites and layers.
- **TypeScript 5.x** — Strict typing, ES modules, path aliases.
- **Vite 5.x** — Development server, HMR, and production bundling.
- **ESLint 9.x + Prettier 3.x** — Linting and consistent code formatting.

## Prerequisites

- **Node.js** `>=18.0.0`
- npm (bundled with Node.js)

## Setup Instructions

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The dev server listens on port `3000` and binds to `0.0.0.0` for mobile testing.

## Available Scripts

| Script              | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start the Vite development server with HMR.     |
| `npm run build`     | Type-check with `tsc` and produce a Vite build. |
| `npm run preview`   | Preview the production build locally.           |
| `npm run lint`      | Run ESLint over the codebase.                   |
| `npm run type-check`| Run TypeScript compiler without emitting files. |

## Architecture Overview

- **Modular structure** — Source is organized into focused modules under `src/`
  (engine, behaviors, components, storage, export, utils, types).
- **ESM everywhere** — The project uses native ES modules (`"type": "module"`).
- **Strict typing** — `tsconfig.json` enables `strict: true` with additional safety
  flags (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`).
- **Path aliases** — Use `@/*` to import from `src/*` (e.g. `import { X } from '@/engine/X'`).

## Mobile Testing

The dev server binds to all network interfaces (`host: '0.0.0.0'`), so the editor can be
accessed from a phone or tablet on the same local network:

1. Start the dev server: `npm run dev`.
2. Find your machine's local IP address (e.g. `192.168.1.42`).
3. Open `http://<local-ip>:3000` on the mobile device.

## CI/CD

This repository ships a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on
every push to `main` and every pull request. The pipeline installs dependencies, runs
the linter, performs a type-check, and produces a production build to catch regressions
early.
