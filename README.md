# tusk-games-examples

Public reference games and upload-ready example bundles for Tusk Games.

This repo is for sample games, packaging rules, and creator-facing reference implementations. The SDK lives elsewhere.

## Goals

- Ship small, readable example games that show how browser-first games should fit the Tusk Games platform.
- Keep each example easy to study, easy to package, and easy to upload through Flipper's admin tooling.
- Track asset provenance from the start so the repo stays clean as it grows.

## Repo Layout

```text
games/
  _template/        Reusable starting point for new samples
  <game-slug>/      One game per directory
scripts/            Validation and packaging scripts
dist/               Generated zip bundles (ignored by git except .gitignore)
```

Each real game directory should contain:

- `game.json` metadata used for validation and future automation
- `src/` upload-ready static files with `index.html` at the `src/` root
- `promo/` thumbnails, screenshots, and release notes that are not part of the upload bundle

## Current Sample Slate

- `snack-stack-safari` - kids-tier sorting puzzler where each animal changes the stacking rule
- `loop-lancer` - score-attack arena prototype where dashes and dash trails clear drones
- `parcel-shift` - routing game about rewiring conveyors before the next dispatch tick
- `basement-frequency` - atmospheric adults-tier survival prototype built around short radio pulses

## Commands

```bash
just install
just validate
just package
just package loop-lancer
```

`just package` creates upload-ready zip bundles in `dist/` by zipping the contents of each game's `src/` directory so `src/index.html` ends up as the bundle-root `index.html`.

## Licensing

- Source code is licensed under MIT in `LICENSE`.
- Non-code assets are licensed separately in `LICENSE-assets`.
- Third-party and per-asset provenance should be tracked in `ATTRIBUTION.md`.
