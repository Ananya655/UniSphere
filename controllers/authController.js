/**
 * Authentication Controller
 * Handles user registration and (future) login logic.
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { validateRegisterInput } = require('../utils/validateRegister');
const { generateToken } = require('../utils/generateToken');

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Register a new student account and return a JWT.
 */
const register = async (req, res, next) => {
  try {
    // -------------------------------------------------------------------------
    // Validate request body
    // -------------------------------------------------------------------------
    const validation = validateRegisterInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors,
      });
    }

    const { name, email, password, college, branch, current_year } = validation.data;

    // -------------------------------------------------------------------------
    // Check for duplicate email
    // -------------------------------------------------------------------------
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // -------------------------------------------------------------------------
    // Hash password and insert user
    // -------------------------------------------------------------------------
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, college, branch, current_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, college, branch, current_year]
    );

    const user = {
      id: result.insertId,
      name,
      email,
      college,
      branch,
      current_year,
    };

    // -------------------------------------------------------------------------
    // Generate JWT and respond
    // -------------------------------------------------------------------------
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user,
    });
  } catch (error) {
    // Handle race condition if two requests register the same email simultaneously
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    next(error);
  }
};

module.exports = { register };
