import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { discoverGameSlugs, distDir, validateGames } from './lib/game-repo.mjs';

function parseArgs(argv) {
  const args = { game: null };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--game') {
      args.game = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  if (args.game === '') {
    args.game = null;
  }

  return args;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const targetSlugs = args.game === null ? discoverGameSlugs() : [args.game];

  if (targetSlugs.length === 0) {
    console.log(
      'No game directories found in games/. Add a real game folder to create bundles.',
    );
    process.exit(0);
  }

  const games = validateGames(targetSlugs);
  mkdirSync(distDir, { recursive: true });

  for (const game of games) {
    const outputPath = join(distDir, `${game.slug}.zip`);

    rmSync(outputPath, { force: true });

    const result = spawnSync('zip', ['-qr', outputPath, '.'], {
      cwd: game.srcDir,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      const stderr = result.stderr.trim();
      throw new Error(
        stderr === '' ? `zip failed while packaging ${game.slug}` : stderr,
      );
    }

    console.log(`Packaged ${game.slug} -> dist/${game.slug}.zip`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
