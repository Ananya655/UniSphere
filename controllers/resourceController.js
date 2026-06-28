/**
 * Resource Controller
 * Handles academic resource upload and (future) retrieval logic.
 */

const { pool } = require('../config/db');
const { validateResourceUploadInput } = require('../utils/validateResourceUpload');
const { deleteCloudinaryFile } = require('../utils/deleteCloudinaryFile');
const {
  parseResourceFilters,
  buildResourceWhereClause,
} = require('../utils/buildResourceQuery');

/**
 * Build a resource object for API responses.
 */
const toResourceResponse = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  subject_id: row.subject_id,
  branch: row.branch,
  semester: row.semester,
  year: row.year,
  type: row.type,
  file_url: row.file_url,
  uploaded_by: row.uploaded_by,
  downloads_count: row.downloads_count,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * Build a resource list item with joined uploader and subject details.
 */
const toResourceListItem = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  subject_id: row.subject_id,
  subject_name: row.subject_name,
  branch: row.branch,
  semester: row.semester,
  year: row.year,
  type: row.type,
  file_url: row.file_url,
  uploaded_by: row.uploaded_by,
  uploader_name: row.uploader_name,
  uploader_college: row.uploader_college,
  uploader_branch: row.uploader_branch,
  downloads_count: row.downloads_count,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * POST /api/resources/upload
 * Upload a PDF resource to Cloudinary and save metadata to MySQL.
 * Requires authMiddleware + uploadMiddleware before this handler.
 */
const uploadResource = async (req, res, next) => {
  let cloudinaryPublicId = null;

  try {
    // -------------------------------------------------------------------------
    // Ensure a PDF file was uploaded to Cloudinary
    // -------------------------------------------------------------------------
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required.',
      });
    }

    cloudinaryPublicId = req.file.filename;

    const fileUrl = req.file.path || req.file.secure_url;

    if (!fileUrl) {
      await deleteCloudinaryFile(cloudinaryPublicId);
      return res.status(500).json({
        success: false,
        message: 'File upload failed. Please try again.',
      });
    }

    // -------------------------------------------------------------------------
    // Validate form fields
    // -------------------------------------------------------------------------
    const validation = validateResourceUploadInput(req.body);

    if (!validation.isValid) {
      await deleteCloudinaryFile(cloudinaryPublicId);
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors,
      });
    }

    const { title, description, subject_id, branch, semester, year, type } = validation.data;

    // -------------------------------------------------------------------------
    // Verify subject exists
    // -------------------------------------------------------------------------
    const [subjects] = await pool.execute(
      'SELECT id FROM subjects WHERE id = ? LIMIT 1',
      [subject_id]
    );

    if (subjects.length === 0) {
      await deleteCloudinaryFile(cloudinaryPublicId);
      return res.status(400).json({
        success: false,
        message: 'Invalid subject.',
      });
    }

    // -------------------------------------------------------------------------
    // Insert resource — uploaded_by always from JWT, never from client
    // college taken from authenticated user for DB requirement
    // -------------------------------------------------------------------------
    const uploadedBy = req.user.id;
    const college = req.user.college;

    const [result] = await pool.execute(
      `INSERT INTO resources
        (title, description, subject_id, branch, semester, year, type, file_url, uploaded_by, college)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, subject_id, branch, semester, year, type, fileUrl, uploadedBy, college]
    );

    const [rows] = await pool.execute(
      `SELECT id, title, description, subject_id, branch, semester, year, type,
              file_url, uploaded_by, downloads_count, created_at, updated_at
       FROM resources WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully.',
      resource: toResourceResponse(rows[0]),
    });
  } catch (error) {
    await deleteCloudinaryFile(cloudinaryPublicId);

    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        success: false,
        message: 'Database schema error. Ensure the resources table includes a year column.',
      });
    }

    console.error('Resource upload failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to save resource. Please try again.',
    });
  }
};

/**
 * GET /api/resources
 * List resources with optional filters. Joins users and subjects.
 * Public route — no authentication required.
 */
const getResources = async (req, res, next) => {
  try {
    // -------------------------------------------------------------------------
    // Parse and validate query parameters
    // -------------------------------------------------------------------------
    const parsed = parseResourceFilters(req.query);

    if (!parsed.isValid) {
      return res.status(400).json({
        success: false,
        message: parsed.message,
      });
    }

    const { whereClause, params } = buildResourceWhereClause(parsed.filters);

    // -------------------------------------------------------------------------
    // Fetch resources with joins — newest first
    // -------------------------------------------------------------------------
    const sql = `
      SELECT
        resources.id,
        resources.title,
        resources.description,
        resources.subject_id,
        resources.branch,
        resources.semester,
        resources.year,
        resources.type,
        resources.file_url,
        resources.uploaded_by,
        resources.downloads_count,
        resources.created_at,
        resources.updated_at,
        users.name AS uploader_name,
        users.college AS uploader_college,
        users.branch AS uploader_branch,
        subjects.name AS subject_name
      FROM resources
      INNER JOIN users ON resources.uploaded_by = users.id
      INNER JOIN subjects ON resources.subject_id = subjects.id
      ${whereClause}
      ORDER BY resources.created_at DESC
    `;

    const [rows] = await pool.execute(sql, params);

    const resources = rows.map(toResourceListItem);

    return res.status(200).json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error('Failed to fetch resources:', error.message);
    next(error);
  }
};

module.exports = { uploadResource, getResources };
