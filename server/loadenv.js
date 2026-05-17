// Loads server/.env (if present) before any other module reads process.env.
// Imported first in index.js so config.js sees the values.
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env');
try {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
    console.log('Loaded environment from .env');
  }
} catch (e) {
  console.warn('Could not load .env:', e.message);
}
