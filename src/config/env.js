import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

// Fallback JWT secret is ONLY acceptable outside production.
// In production we refuse to boot with a weak/default secret (see below).
const FALLBACK_JWT_SECRET = 'super_secret_jwt_key_campushub_2026';

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campushub_db',
  jwtSecret: process.env.JWT_SECRET || FALLBACK_JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // Public base URL of THIS API (e.g. https://campushub-api.onrender.com).
  // Used to build absolute image URLs when the app runs behind a proxy.
  // RENDER_EXTERNAL_URL is set automatically by Render for every web service.
  publicUrl: process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || ''
};

// Fail fast in production when secrets were never configured.
// A default JWT secret in production would let anyone forge an admin token.
export const assertSecureConfig = () => {
  if (!config.isProduction) return;

  const problems = [];
  if (!process.env.JWT_SECRET) problems.push('JWT_SECRET is not set');
  else if (config.jwtSecret === FALLBACK_JWT_SECRET) problems.push('JWT_SECRET is still the default value');
  if (!process.env.MONGO_URI) problems.push('MONGO_URI is not set (Atlas connection string expected)');

  if (problems.length > 0) {
    console.error(`❌ Refusing to start in production:\n   - ${problems.join('\n   - ')}`);
    process.exit(1);
  }
};
