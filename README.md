# PROMPT FPS

Two isolated instances of the actual Chocolate Doom 3.1.1 engine, compiled to WebAssembly, play the same Freedoom map from the same initial state. A TypeSafe Jev Choice decision—or an explicitly labeled deterministic offline policy—selects a tactical macro; the local motor controller turns that macro into Doom controls.

## Quick start

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173/compare`. Click **Connect Jev**, paste a TypeSafe API key, then start both players. The key is transmitted once to the local Node/Vite server, kept only in process memory, never logged or persisted, and removed on disconnect/page close. Alternatively start the server with `TYPESAFE_API_KEY` in its environment. Never use a `VITE_` key variable.

Routes: `/compare`, `/demo/survivalist`, and `/demo/berserker`. A legally owned commercial IWAD may be used during local development, but the project and artifacts ship only Freedoom 0.13.0.

## Architecture

The vendored GPL Chocolate Doom fork lives in `vendor/chocolate-doom`. `browser_doom_bridge.c` exposes the real engine's health, armor, ammo, damage, coordinates, kills, line-of-sight monsters, and visible pickups to JavaScript. The browser converts that observation to the same bounded tactical schema for both players. **Jev receives structured game state, not raw pixels.** Jev never controls engine internals directly: the local controller executes each macro as movement, turning, firing, weapon, or use inputs.

The server sends `state`, `model: "jev-latest"`, and a typed `choice` question to `POST https://api.typesafe.ai/v1/systemone`, then validates `choice`, `probabilities`, and `confidence`. A failed or low-confidence call is visibly marked `FALLBACK`; it never silently becomes simulated Jev. Offline mode permanently displays **OFFLINE SIMULATED POLICY — NOT JEV**.

## Commands

```sh
npm test                 # unit/schema/policy/controller tests
npm run build            # TypeScript + Vite production build
npm start                # serve the production build on 127.0.0.1:4173
npm run smoke            # boot and inspect two WASM engines in Chromium
npm run video            # ordered-frame capture + H.264 encode
npm run verify:video     # ffprobe JSON + five-frame contact sheet
```

`npm run build:wasm` documents the Emscripten rebuild entry point. The checked-in WebAssembly was built from the vendored source with Emscripten 4.0.14. See `engine/UPSTREAM.md` and `licenses/` for exact provenance and notices.

## Licensing and limitations

Chocolate Doom is GPL-2.0-or-later and its corresponding fork source is included. Freedoom content is BSD-licensed and credited in `licenses/`. No commercial Doom WAD, texture, sprite, map, logo, music, or sound is included. This is real Doom-engine gameplay, but the default content is Freedoom. The controller performs short keyboard-level macros; it is intentionally not an omniscient pathfinder.
