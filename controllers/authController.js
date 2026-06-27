/**
 * Authentication Controller
 * Handles user registration and login.
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { validateRegisterInput } = require('../utils/validateRegister');
const { validateLoginInput } = require('../utils/validateLogin');
const { generateToken } = require('../utils/generateToken');

const SALT_ROUNDS = 10;

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

/**
 * Build a safe user object for API responses (excludes password).
 */
const toPublicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  college: row.college,
  branch: row.branch,
  current_year: row.current_year,
});

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

/**
 * POST /api/auth/login
 * Authenticate a student and return a JWT.
 */
const login = async (req, res, next) => {
  try {
    // -------------------------------------------------------------------------
    // Validate request body
    // -------------------------------------------------------------------------
    const validation = validateLoginInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors,
      });
    }

    const { email, password } = validation.data;

    // -------------------------------------------------------------------------
    // Look up user by email
    // -------------------------------------------------------------------------
    const [rows] = await pool.execute(
      `SELECT id, name, email, password, college, branch, current_year
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS_MESSAGE,
      });
    }

    const dbUser = rows[0];

    // -------------------------------------------------------------------------
    // Compare password with stored bcrypt hash
    // -------------------------------------------------------------------------
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS_MESSAGE,
      });
    }

    const user = toPublicUser(dbUser);

    // -------------------------------------------------------------------------
    // Generate JWT and respond
    // -------------------------------------------------------------------------
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };
