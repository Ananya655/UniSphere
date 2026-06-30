    /**
 * Question Routes
 * Standalone routes for fetching a single query, posting answers, and resolving.
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getQueryById,
  createAnswer,
  resolveQuery,
} = require('../controllers/queryController');

const router = express.Router();

// GET   /api/questions/:id          - Fetch a single query with resource, poster, and answers
router.get('/:id', getQueryById);

// POST  /api/queries/:id/answers    - Post an answer to a query
router.post('/:id/answers', protect, createAnswer);

// PATCH /api/questions/:id/resolve  - Mark a query as resolved (owner only)
router.patch('/:id/resolve', protect, resolveQuery);

module.exports = router;