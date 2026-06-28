/**
 * Resource Controller
 * Handles academic resource upload and (future) retrieval logic.
 */

const { pool } = require('../config/db');
const { validateResourceUploadInput } = require('../utils/validateResourceUpload');
const { deleteCloudinaryFile } = require('../utils/deleteCloudinaryFile');

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

module.exports = { uploadResource };
