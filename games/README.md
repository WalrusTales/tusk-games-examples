# Games

Each real sample game belongs in `games/<slug>/`.

## Required Files

- `game.json`
- `src/index.html` at the root of `src/`
- `promo/`

## Metadata

`game.json` should stay small and human-readable. Current required fields:

- `id`
- `title`
- `summary`
- `genre`
- `ageTier`
- `entryPoint` (`"index.html"` only)
- `platforms`
- `tags`

Example:

```json
{
  "id": "loop-lancer",
  "title": "Loop Lancer",
  "summary": "Score-attack arena game where your dash trail is the weapon.",
  "genre": "arcade",
  "ageTier": "teens",
  "entryPoint": "index.html",
  "platforms": ["desktop", "mobile"],
  "tags": ["arcade", "score-attack", "touch-friendly"]
}
```

## Packaging Rule

Only the contents of `src/` are zipped into the upload bundle, so `src/index.html` becomes the root `index.html` in the final archive. `promo/` is for screenshots, thumbnails, and notes that should not ship with the game build.
