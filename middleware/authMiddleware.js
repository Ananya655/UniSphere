/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches decoded user data to req.user.
 */

const jwt = require('jsonwebtoken');

/**
 * Protect routes that require a valid JWT.
 * Expects: Authorization: Bearer <token>
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // -------------------------------------------------------------------------
    // Check for Authorization header
    // -------------------------------------------------------------------------
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // -------------------------------------------------------------------------
    // Validate Bearer token format
    // -------------------------------------------------------------------------
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format.',
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      const error = new Error('JWT_SECRET is not configured on the server');
      error.statusCode = 500;
      throw error;
    }

    // -------------------------------------------------------------------------
    // Verify token and attach payload to request
    // -------------------------------------------------------------------------
    const decoded = jwt.verify(token, secret);
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    next(error);
  }
};

module.exports = { protect };
