/**
 * Discussion Routes
 * Maps community forum endpoints to controller handlers.
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createDiscussion,
  getDiscussions,
  getDiscussionById,
  createComment,
  upvoteDiscussion,
} = require('../controllers/discussionController');

const router = express.Router();

// GET  /api/discussions     - List all discussions (optional category filter)
router.get('/', getDiscussions);

// POST /api/discussions     - Create a new discussion post
router.post('/', protect, createDiscussion);

// GET  /api/discussions/:id - Fetch a single discussion with comments
router.get('/:id', getDiscussionById);

// POST /api/discussions/:id/comments - Add a comment to a discussion
router.post('/:id/comments', protect, createComment);

// POST /api/discussions/:id/upvote   - Upvote a discussion (once per user)
router.post('/:id/upvote', protect, upvoteDiscussion);

module.exports = router;
