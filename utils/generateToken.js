/**
 * JWT Token Generation
 * Creates signed tokens for authenticated users.
 */

const jwt = require('jsonwebtoken');

const TOKEN_EXPIRY = '7d';

/**
 * Generate a JWT for a registered user.
 * @param {object} user - User fields to embed in the token payload
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error('JWT_SECRET is not configured on the server');
    error.statusCode = 500;
    throw error;
  }

  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      college: user.college,
      branch: user.branch,
      current_year: user.current_year,
    },
    secret,
    { expiresIn: TOKEN_EXPIRY }
  );
};

module.exports = { generateToken };
