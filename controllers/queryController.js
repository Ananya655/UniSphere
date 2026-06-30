/**
 * Query Controller
 * Handles academic Q&A tied to uploaded resources.
 */

const { pool } = require('../config/db');
const { validateQueryInput } = require('../utils/validateQuery');
const { validateAnswerInput } = require('../utils/validateAnswer');

/**
 * Build a public query list item (with poster details, no answers).
 */
const toQueryListItem = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  is_resolved: Boolean(row.is_resolved),
  created_at: row.created_at,
  updated_at: row.updated_at,
  posted_by: {
    id: row.poster_id,
    name: row.poster_name,
    college: row.poster_college,
    branch: row.poster_branch,
    current_year: row.poster_current_year,
  },
});

/**
 * Build an answer object with poster details.
 */
const toAnswerItem = (row) => ({
  id: row.id,
  body: row.body,
  created_at: row.created_at,
  updated_at: row.updated_at,
  posted_by: {
    id: row.poster_id,
    name: row.poster_name,
    college: row.poster_college,
    branch: row.poster_branch,
    current_year: row.poster_current_year,
  },
});

// =============================================================================
// POST /api/resources/:resourceId/questions
// Create a new query linked to a resource. Protected.
// =============================================================================
const createQuery = async (req, res, next) => {
  try {
    const resourceId = Number.parseInt(req.params.resourceId, 10);

    if (Number.isNaN(resourceId) || resourceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID.',
      });
    }

    // -------------------------------------------------------------------------
    // Verify resource exists
    // -------------------------------------------------------------------------
    const [resources] = await pool.execute(
      'SELECT id, title FROM resources WHERE id = ? LIMIT 1',
      [resourceId]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    // -------------------------------------------------------------------------
    // Validate request body
    // -------------------------------------------------------------------------
    const validation = validateQueryInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors,
      });
    }

    const { title, body } = validation.data;
    const postedBy = req.user.id;

    // -------------------------------------------------------------------------
    // Insert query
    // -------------------------------------------------------------------------
    const [result] = await pool.execute(
      `INSERT INTO queries (resource_id, title, body, posted_by, is_resolved)
       VALUES (?, ?, ?, ?, FALSE)`,
      [resourceId, title, body, postedBy]
    );

    const [rows] = await pool.execute(
      `SELECT
         q.id,
         q.title,
         q.body,
         q.is_resolved,
         q.created_at,
         q.updated_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year
       FROM queries q
       INNER JOIN users u ON q.posted_by = u.id
       WHERE q.id = ? LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Query posted successfully.',
      query: toQueryListItem(rows[0]),
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/resources/:resourceId/questions
// List all queries for a resource. Public.
// =============================================================================
const getQueriesByResource = async (req, res, next) => {
  try {
    const resourceId = Number.parseInt(req.params.resourceId, 10);

    if (Number.isNaN(resourceId) || resourceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID.',
      });
    }

    // -------------------------------------------------------------------------
    // Verify resource exists
    // -------------------------------------------------------------------------
    const [resources] = await pool.execute(
      'SELECT id FROM resources WHERE id = ? LIMIT 1',
      [resourceId]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    // -------------------------------------------------------------------------
    // Fetch all queries for this resource with poster details — newest first
    // -------------------------------------------------------------------------
    const [rows] = await pool.execute(
      `SELECT
         q.id,
         q.title,
         q.body,
         q.is_resolved,
         q.created_at,
         q.updated_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year
       FROM queries q
       INNER JOIN users u ON q.posted_by = u.id
       WHERE q.resource_id = ?
       ORDER BY q.created_at DESC`,
      [resourceId]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      queries: rows.map(toQueryListItem),
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/questions/:id
// Return a single query with resource details, poster details, and all answers.
// Public.
// =============================================================================
const getQueryById = async (req, res, next) => {
  try {
    const queryId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(queryId) || queryId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query ID.',
      });
    }

    // -------------------------------------------------------------------------
    // Fetch query with poster and resource details
    // -------------------------------------------------------------------------
    const [queryRows] = await pool.execute(
      `SELECT
         q.id,
         q.title,
         q.body,
         q.is_resolved,
         q.created_at,
         q.updated_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year,
         r.id    AS resource_id,
         r.title AS resource_title,
         r.description AS resource_description,
         r.branch AS resource_branch,
         r.semester AS resource_semester,
         r.year AS resource_year,
         r.type AS resource_type,
         r.file_url AS resource_file_url
       FROM queries q
       INNER JOIN users u ON q.posted_by = u.id
       LEFT JOIN resources r ON q.resource_id = r.id
       WHERE q.id = ? LIMIT 1`,
      [queryId]
    );

    if (queryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found.',
      });
    }

    const q = queryRows[0];

    // -------------------------------------------------------------------------
    // Fetch all answers for this query — oldest first
    // -------------------------------------------------------------------------
    const [answerRows] = await pool.execute(
      `SELECT
         a.id,
         a.body,
         a.created_at,
         a.updated_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year
       FROM answers a
       INNER JOIN users u ON a.posted_by = u.id
       WHERE a.query_id = ?
       ORDER BY a.created_at ASC`,
      [queryId]
    );

    return res.status(200).json({
      success: true,
      query: {
        id: q.id,
        title: q.title,
        body: q.body,
        is_resolved: Boolean(q.is_resolved),
        created_at: q.created_at,
        updated_at: q.updated_at,
        posted_by: {
          id: q.poster_id,
          name: q.poster_name,
          college: q.poster_college,
          branch: q.poster_branch,
          current_year: q.poster_current_year,
        },
        resource: q.resource_id
          ? {
              id: q.resource_id,
              title: q.resource_title,
              description: q.resource_description,
              branch: q.resource_branch,
              semester: q.resource_semester,
              year: q.resource_year,
              type: q.resource_type,
              file_url: q.resource_file_url,
            }
          : null,
        answers: answerRows.map(toAnswerItem),
        answer_count: answerRows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// POST /api/queries/:id/answers
// Post an answer to a query. Protected.
// =============================================================================
const createAnswer = async (req, res, next) => {
  try {
    const queryId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(queryId) || queryId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query ID.',
      });
    }

    // -------------------------------------------------------------------------
    // Verify query exists
    // -------------------------------------------------------------------------
    const [queries] = await pool.execute(
      'SELECT id FROM queries WHERE id = ? LIMIT 1',
      [queryId]
    );

    if (queries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found.',
      });
    }

    // -------------------------------------------------------------------------
    // Validate request body
    // -------------------------------------------------------------------------
    const validation = validateAnswerInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors,
      });
    }

    const { body } = validation.data;
    const postedBy = req.user.id;

    // -------------------------------------------------------------------------
    // Insert answer
    // -------------------------------------------------------------------------
    const [result] = await pool.execute(
      `INSERT INTO answers (query_id, body, posted_by)
       VALUES (?, ?, ?)`,
      [queryId, body, postedBy]
    );

    const [rows] = await pool.execute(
      `SELECT
         a.id,
         a.body,
         a.created_at,
         a.updated_at,
         u.id   AS poster_id,
         u.name AS poster_name,
         u.college AS poster_college,
         u.branch AS poster_branch,
         u.current_year AS poster_current_year
       FROM answers a
       INNER JOIN users u ON a.posted_by = u.id
       WHERE a.id = ? LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Answer posted successfully.',
      answer: toAnswerItem(rows[0]),
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PATCH /api/questions/:id/resolve
// Mark a query as resolved. Only the original poster may do this. Protected.
// =============================================================================
const resolveQuery = async (req, res, next) => {
  try {
    const queryId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(queryId) || queryId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query ID.',
      });
    }

    // -------------------------------------------------------------------------
    // Fetch query to verify existence and ownership
    // -------------------------------------------------------------------------
    const [queries] = await pool.execute(
      'SELECT id, posted_by, is_resolved FROM queries WHERE id = ? LIMIT 1',
      [queryId]
    );

    if (queries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found.',
      });
    }

    const query = queries[0];

    // -------------------------------------------------------------------------
    // Only the original poster may resolve their own query
    // -------------------------------------------------------------------------
    if (query.posted_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to resolve this query.',
      });
    }

    // -------------------------------------------------------------------------
    // Guard: already resolved
    // -------------------------------------------------------------------------
    if (query.is_resolved) {
      return res.status(200).json({
        success: true,
        message: 'This query is already marked as resolved.',
      });
    }

    // -------------------------------------------------------------------------
    // Mark as resolved
    // -------------------------------------------------------------------------
    await pool.execute(
      'UPDATE queries SET is_resolved = TRUE WHERE id = ?',
      [queryId]
    );

    return res.status(200).json({
      success: true,
      message: 'Query marked as resolved.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuery,
  getQueriesByResource,
  getQueryById,
  createAnswer,
  resolveQuery,
};