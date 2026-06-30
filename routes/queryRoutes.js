/**
 * Query & Answer Routes
 * Maps academic Q&A endpoints to controller handlers.
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createQuery,
  getQueriesByResource,
  getQueryById,
  createAnswer,
  resolveQuery,
} = require('../controllers/queryController');

const router = express.Router();

// ---------------------------------------------------------------------------
// Resource-scoped query routes
// Mounted under /api/resources in server.js
// ---------------------------------------------------------------------------

// POST /api/resources/:resourceId/questions - Post a question about a resource
router.post('/:resourceId/questions', protect, createQuery);

// GET  /api/resources/:resourceId/questions - List all questions for a resource
router.get('/:resourceId/questions', getQueriesByResource);

module.exports = router;