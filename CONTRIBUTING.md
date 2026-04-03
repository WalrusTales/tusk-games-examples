# Contributing

## Principles

- Keep samples small, readable, and browser-first.
- Prefer plain HTML, CSS, and JavaScript unless a framework or engine is the point of the example.
- Do not depend on remote assets or third-party CDNs for core gameplay.
- Treat every sample as both a launch candidate and a reference implementation.

## Game Contract

Each real game lives in `games/<slug>/` and should include:

- `game.json`
- `src/index.html` at the root of `src/`
- `promo/`

Set `entryPoint` to `index.html`. The upload bundle is the zipped contents of `src/`, not the whole game directory.

## Asset Provenance

- Record every non-code asset in `ATTRIBUTION.md`.
- Keep code under MIT.
- Keep art, audio, screenshots, and other media under the asset license in `LICENSE-assets` unless a game directory explicitly states otherwise.

## Workflow

```bash
just install
just validate
just package
```

Open a pull request only after validation passes and any new assets are documented.
