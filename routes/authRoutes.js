/**
 * Authentication Routes
 * Maps auth endpoints to controller handlers.
 */

const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register - Create a new student account
router.post('/register', register);

// POST /api/auth/login - Authenticate an existing student
router.post('/login', login);

module.exports = router;
