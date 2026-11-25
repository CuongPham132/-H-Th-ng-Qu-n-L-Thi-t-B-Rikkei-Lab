const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generates a signed JWT token
 * @param {Object} payload - { id, email, role }
 * @returns {string}
 */
function generateToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Verifies and decodes a JWT token
 * @param {string} token
 * @returns {Object} decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
};
