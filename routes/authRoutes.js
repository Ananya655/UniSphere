/**
 * Authentication Routes
 * Maps auth endpoints to controller handlers.
 */

const express = require('express');
const { register } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register - Create a new student account
router.post('/register', register);

module.exports = router;
