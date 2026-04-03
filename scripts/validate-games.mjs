import { discoverGameSlugs, validateGames } from './lib/game-repo.mjs';

try {
  const slugs = discoverGameSlugs();

  if (slugs.length === 0) {
    console.log(
      'No game directories found in games/. The scaffold is ready for the first sample.',
    );
    process.exit(0);
  }

  const games = validateGames(slugs);

  for (const game of games) {
    console.log(
      `Validated ${game.slug} (${game.manifest.ageTier}, ${game.manifest.genre})`,
    );
  }

  console.log(`Validated ${games.length} game(s).`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
