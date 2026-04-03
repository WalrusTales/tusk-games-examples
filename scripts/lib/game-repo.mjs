import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const projectRoot = resolve(__dirname, '..', '..');
export const gamesDir = resolve(projectRoot, 'games');
export const distDir = resolve(projectRoot, 'dist');

const requiredStringFields = [
  'id',
  'title',
  'summary',
  'genre',
  'ageTier',
  'entryPoint',
];

const allowedAgeTiers = new Set(['kids', 'teens', 'adults']);
const requiredEntryPoint = 'index.html';

export function discoverGameSlugs() {
  if (!existsSync(gamesDir)) {
    return [];
  }

  return readdirSync(gamesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .sort();
}

export function inspectGame(slug) {
  const gameDir = resolve(gamesDir, slug);
  const manifestPath = resolve(gameDir, 'game.json');
  const srcDir = resolve(gameDir, 'src');
  const promoDir = resolve(gameDir, 'promo');

  const errors = [];
  let manifest = null;

  if (!existsSync(manifestPath)) {
    errors.push(`${slug}: missing game.json`);
  } else {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${slug}: invalid game.json (${message})`);
    }
  }

  if (!existsSync(srcDir)) {
    errors.push(`${slug}: missing src/ directory`);
  }

  if (!existsSync(promoDir)) {
    errors.push(`${slug}: missing promo/ directory`);
  }

  if (manifest !== null) {
    for (const field of requiredStringFields) {
      if (
        typeof manifest[field] !== 'string' ||
        manifest[field].trim() === ''
      ) {
        errors.push(`${slug}: ${field} must be a non-empty string`);
      }
    }

    if (!Array.isArray(manifest.platforms) || manifest.platforms.length === 0) {
      errors.push(`${slug}: platforms must be a non-empty array`);
    } else if (
      manifest.platforms.some(
        (value) => typeof value !== 'string' || value.trim() === '',
      )
    ) {
      errors.push(`${slug}: platforms must contain non-empty strings`);
    }

    if (!Array.isArray(manifest.tags) || manifest.tags.length === 0) {
      errors.push(`${slug}: tags must be a non-empty array`);
    } else if (
      manifest.tags.some(
        (value) => typeof value !== 'string' || value.trim() === '',
      )
    ) {
      errors.push(`${slug}: tags must contain non-empty strings`);
    }

    if (typeof manifest.id === 'string' && manifest.id !== slug) {
      errors.push(`${slug}: manifest id must match directory name`);
    }

    if (
      typeof manifest.ageTier === 'string' &&
      !allowedAgeTiers.has(manifest.ageTier)
    ) {
      errors.push(`${slug}: ageTier must be one of kids, teens, adults`);
    }

    if (typeof manifest.entryPoint === 'string') {
      if (manifest.entryPoint !== requiredEntryPoint) {
        errors.push(
          `${slug}: entryPoint must be ${requiredEntryPoint} at the src/ root`,
        );
      } else if (!existsSync(resolve(srcDir, requiredEntryPoint))) {
        errors.push(
          `${slug}: entryPoint ${requiredEntryPoint} does not exist in src/`,
        );
      }
    }
  }

  return {
    slug,
    manifest,
    gameDir,
    manifestPath,
    srcDir,
    promoDir,
    errors,
  };
}

export function validateGames(slugs = discoverGameSlugs()) {
  const results = slugs.map((slug) => inspectGame(slug));
  const errors = results.flatMap((result) => result.errors);

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return results;
}
