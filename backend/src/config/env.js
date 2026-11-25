const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env (or custom ENV_FILE if specified)
const envPath = process.env.ENV_FILE || path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/**
 * Validates and parses positive integers from environment strings.
 * @param {string|undefined} value
 * @param {number} defaultValue
 * @param {string} varName
 * @returns {number}
 */
function parsePositiveInt(value, defaultValue, varName) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.error(`[FATAL] Invalid environment variable "${varName}": must be a positive integer, received "${value}"`);
    process.exit(1);
  }
  return parsed;
}

// 1. Mandatory Secrets Validation (No hardcoded fallback defaults)
const requiredVars = ['DB_PASSWORD', 'JWT_SECRET'];
const missingVars = requiredVars.filter(
  (name) => !process.env[name] || process.env[name].trim() === ''
);

if (missingVars.length > 0) {
  console.error('================================================================');
  console.error('[FATAL] Missing required environment variable(s) in .env:');
  missingVars.forEach((v) => console.error(`        - ${v}`));
  console.error('Application cannot start without required credentials.');
  console.error('================================================================');
  process.exit(1);
}

// 2. Numeric Configuration Validation
const PORT = parsePositiveInt(process.env.PORT, 5000, 'PORT');
const DB_PORT = parsePositiveInt(process.env.DB_PORT, 3307, 'DB_PORT');
const DB_CONNECTION_LIMIT = parsePositiveInt(process.env.DB_CONNECTION_LIMIT, 10, 'DB_CONNECTION_LIMIT');
const DEFAULT_PICKUP_HOURS = parsePositiveInt(process.env.DEFAULT_PICKUP_HOURS, 48, 'DEFAULT_PICKUP_HOURS');

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT,

  // Database Configuration (Default Host Port 3307 for Rikkei Lab MySQL Container)
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT,
  DB_USER: process.env.DB_USER || 'rikkei_user',
  DB_PASSWORD: process.env.DB_PASSWORD, // Mandatory from .env
  DB_NAME: process.env.DB_NAME || 'rikkei_lab',
  DB_CONNECTION_LIMIT,

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET, // Mandatory from .env
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Business Constants (Immutable)
  DEFAULT_PICKUP_HOURS,
  MAX_LOAN_DAYS: 14,
};

module.exports = env;
