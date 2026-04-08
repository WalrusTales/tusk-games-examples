# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

Sample games and tooling for the Tusk Games platform. Each game is a self-contained, browser-first HTML/CSS/JS bundle that gets zipped and uploaded. The SDK lives in a separate repo.

## Commands

```bash
just install          # pnpm install
just validate         # validate all game.json manifests and directory structure
just package          # zip every game's src/ into dist/<slug>.zip
just package <slug>   # zip a single game
just lint             # biome check .
just fmt              # biome format --write .
just check            # lint + validate
just clean            # rm dist/*.zip
```

CI (`just check` then `just package`) runs on every PR and push to main.

## Code Style

Biome handles linting and formatting. Config: `biome.json`. Key settings: 2-space indent, single quotes, semicolons always, trailing commas.

## Game Structure

Games live in `games/<slug>/`. Directories starting with `.` or `_` are ignored by discovery (e.g. `_template/`).

Required layout per game:

- `game.json` — manifest with required fields: `id`, `title`, `summary`, `genre`, `ageTier`, `entryPoint`, `platforms`, `tags`
- `src/` — upload-ready static files; `src/index.html` must exist and `entryPoint` must be `"index.html"`
- `promo/` — screenshots, thumbnails, notes (not included in the zip bundle)

Validation rules (enforced by `scripts/lib/game-repo.mjs`):

- `id` must match the directory slug
- `ageTier` must be one of: `kids`, `teens`, `adults`
- `platforms` and `tags` must be non-empty arrays of non-empty strings

## Packaging

`just package` zips only the contents of `src/`, so `src/index.html` becomes the bundle-root `index.html`. Output goes to `dist/<slug>.zip`.

## Game Conventions

- Prefer plain HTML, CSS, and vanilla JS — no frameworks unless the framework is the point of the example.
- No remote assets or third-party CDNs for core gameplay.
- Every non-code asset must be recorded in `ATTRIBUTION.md`.
- Code is MIT licensed; art/audio/media use the separate license in `LICENSE-assets`.
