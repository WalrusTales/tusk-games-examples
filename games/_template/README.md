# _template

Starting point for a new sample game.

This directory is intentionally ignored by the validation and packaging scripts because its name starts with `_`.

To create a new game:

1. Copy `_template` to `games/<your-slug>`.
2. Update `game.json`.
3. Replace the contents of `src/`.
4. Add promo assets and notes in `promo/`.
5. Run `just validate` and `just package`.
