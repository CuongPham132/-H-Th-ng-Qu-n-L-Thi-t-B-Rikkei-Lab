const bcrypt = require('bcryptjs');

// Cost factor 12 (aligns with the initial bcrypt seed data cost factor 12)
const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt
 * @param {string} plainTextPassword
 * @returns {Promise<string>}
 */
async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt hash
 * @param {string} plainTextPassword
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainTextPassword, passwordHash) {
  if (!plainTextPassword || !passwordHash) return false;
  return bcrypt.compare(plainTextPassword, passwordHash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
