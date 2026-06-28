/**
 * Upload Middleware
 * Handles PDF file uploads to Cloudinary via multer-storage-cloudinary.
 */

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const UPLOAD_FOLDER = 'unisphere-resources';
const ALLOWED_MIME_TYPE = 'application/pdf';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const PDF_ONLY_MESSAGE = 'Only PDF files are allowed.';

/**
 * Reject any file that is not a PDF based on MIME type.
 */
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype !== ALLOWED_MIME_TYPE) {
    const error = new Error(PDF_ONLY_MESSAGE);
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

/**
 * Cloudinary storage engine — stores uploaded PDFs as raw resources.
 */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: UPLOAD_FOLDER,
    resource_type: 'raw',
    format: 'pdf',
    allowed_formats: ['pdf'],
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: pdfFileFilter,
});

/**
 * Middleware wrapper for single PDF upload (field name: "file").
 * Handles multer and Cloudinary errors with consistent JSON responses.
 */
const uploadResource = (req, res, next) => {
  if (!isCloudinaryConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Cloudinary is not configured on the server',
    });
  }

  multerUpload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    // Rejected non-PDF file
    if (error.message === PDF_ONLY_MESSAGE) {
      return res.status(400).json({
        success: false,
        message: PDF_ONLY_MESSAGE,
      });
    }

    // File exceeds 10 MB limit
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size must not exceed 10 MB.',
      });
    }

    next(error);
  });
};

module.exports = { uploadResource, UPLOAD_FOLDER, MAX_FILE_SIZE_BYTES };
