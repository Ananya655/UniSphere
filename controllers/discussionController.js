/**
 * Discussion Controller
 * Handles community forum posts, comments, and upvotes.
 */

const { pool } = require('../config/db');
const {
  validateDiscussionPostInput,
  validateDiscussionCategoryFilter,
  validateDiscussionCommentInput,
} = require('../utils/validateDiscussion');

/**
 * Build poster details from a joined row.
 */
const toPoster = (row) => ({
  id: row.poster_id,
  name: row.poster_name,
  college: row.poster_college,
  branch: row.poster_branch,
  current_year: row.poster_current_year,
});

/**
 * Build a discussion list item with poster details.
 */
const toDiscussionListItem = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  category: row.category,
  upvotes: row.upvotes,
  created_at: row.created_at,
  updated_at: row.updated_at,
  posted_by: toPoster(row),
});

/**
 * Build a comment object with poster details.
 */
const toCommentItem = (row) => ({
  id: row.id,
  body: row.body,
  created_at: row.created_at,
  posted_by: toPoster(row),
});

/**
 * Parse and validate a discussion post ID from route params.
 */
const parsePostId = (param) => {
  const postId = Number.parseInt(param, 10);
  if (Number.isNaN(postId) || postId <= 0) {
    return null;
  }
  return postId;
};

// =============================================================================
// POST /api/discussions
// Create a new community discussion post. Protected.
// =============================================================================
const createDiscussion = async (req, res, next) => {
  try {
    const validation = validateDiscussionPostInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors,
      });
    }

    const { title, body, category } = validation.data;
    const postedBy = req.user.id;

    const [result] = await pool.execute(
      `INSERT INTO discussion_posts (title, body, category, posted_by, upvotes)
       VALUES (?, ?, ?, ?, 0)`,
      [title, body, category, postedBy]
    );

    const [rows] = await pool.execute(
      `SELECT
         d.id,
         d.title,
         d.body,
         d.category,
         d.upvotes,
         d.created_at,
         d.updated_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year
       FROM discussion_posts d
       INNER JOIN users u ON d.posted_by = u.id
       WHERE d.id = ? LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Discussion posted successfully.',
      discussion: toDiscussionListItem(rows[0]),
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/discussions
// List all discussion posts with optional category filter. Public.
// =============================================================================
const getDiscussions = async (req, res, next) => {
  try {
    const categoryValidation = validateDiscussionCategoryFilter(req.query.category);

    if (!categoryValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: categoryValidation.message,
      });
    }

    const params = [];
    let whereClause = '';

    if (categoryValidation.category) {
      whereClause = 'WHERE d.category = ?';
      params.push(categoryValidation.category);
    }

    const [rows] = await pool.execute(
      `SELECT
         d.id,
         d.title,
         d.body,
         d.category,
         d.upvotes,
         d.created_at,
         d.updated_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year
       FROM discussion_posts d
       INNER JOIN users u ON d.posted_by = u.id
       ${whereClause}
       ORDER BY d.created_at DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      discussions: rows.map(toDiscussionListItem),
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/discussions/:id
// Return a single discussion with poster details and all comments. Public.
// =============================================================================
const getDiscussionById = async (req, res, next) => {
  try {
    const postId = parsePostId(req.params.id);

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid discussion ID.',
      });
    }

    const [postRows] = await pool.execute(
      `SELECT
         d.id,
         d.title,
         d.body,
         d.category,
         d.upvotes,
         d.created_at,
         d.updated_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year
       FROM discussion_posts d
       INNER JOIN users u ON d.posted_by = u.id
       WHERE d.id = ? LIMIT 1`,
      [postId]
    );

    if (postRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found.',
      });
    }

    const [commentRows] = await pool.execute(
      `SELECT
         c.id,
         c.body,
         c.created_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year
       FROM discussion_comments c
       INNER JOIN users u ON c.posted_by = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

    const post = postRows[0];

    return res.status(200).json({
      success: true,
      discussion: {
        id: post.id,
        title: post.title,
        body: post.body,
        category: post.category,
        upvotes: post.upvotes,
        created_at: post.created_at,
        updated_at: post.updated_at,
        posted_by: toPoster(post),
        comments: commentRows.map(toCommentItem),
        comment_count: commentRows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// POST /api/discussions/:id/comments
// Add a comment to a discussion post. Protected.
// =============================================================================
const createComment = async (req, res, next) => {
  try {
    const postId = parsePostId(req.params.id);

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid discussion ID.',
      });
    }

    const [posts] = await pool.execute(
      'SELECT id FROM discussion_posts WHERE id = ? LIMIT 1',
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found.',
      });
    }

    const validation = validateDiscussionCommentInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors,
      });
    }

    const { body } = validation.data;
    const postedBy = req.user.id;

    const [result] = await pool.execute(
      `INSERT INTO discussion_comments (post_id, body, posted_by)
       VALUES (?, ?, ?)`,
      [postId, body, postedBy]
    );

    const [rows] = await pool.execute(
      `SELECT
         c.id,
         c.body,
         c.created_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year
       FROM discussion_comments c
       INNER JOIN users u ON c.posted_by = u.id
       WHERE c.id = ? LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Comment posted successfully.',
      comment: toCommentItem(rows[0]),
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// POST /api/discussions/:id/upvote
// Upvote a discussion post once per user. Protected.
// =============================================================================
const upvoteDiscussion = async (req, res, next) => {
  let connection;

  try {
    const postId = parsePostId(req.params.id);

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid discussion ID.',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [posts] = await connection.execute(
      'SELECT id, upvotes FROM discussion_posts WHERE id = ? LIMIT 1 FOR UPDATE',
      [postId]
    );

    if (posts.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Discussion not found.',
      });
    }

    const userId = req.user.id;

    const [existingUpvotes] = await connection.execute(
      'SELECT id FROM post_upvotes WHERE post_id = ? AND user_id = ? LIMIT 1',
      [postId, userId]
    );

    if (existingUpvotes.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Already upvoted',
      });
    }

    await connection.execute(
      'INSERT INTO post_upvotes (post_id, user_id) VALUES (?, ?)',
      [postId, userId]
    );

    await connection.execute(
      'UPDATE discussion_posts SET upvotes = upvotes + 1 WHERE id = ?',
      [postId]
    );

    const [updatedRows] = await connection.execute(
      'SELECT upvotes FROM discussion_posts WHERE id = ? LIMIT 1',
      [postId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Discussion upvoted successfully.',
      upvotes: updatedRows[0].upvotes,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  createDiscussion,
  getDiscussions,
  getDiscussionById,
  createComment,
  upvoteDiscussion,
};
