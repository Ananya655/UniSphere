/**
 * Authentication Routes
 * Maps auth endpoints to controller handlers.
 */

const express = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/register - Create a new student account
router.post('/register', register);

// POST /api/auth/login - Authenticate an existing student
router.post('/login', login);

// GET /api/auth/profile - Fetch authenticated user's profile
router.get('/profile', protect, getProfile);

module.exports = router;
