/**
 * Resource Routes
 * Maps resource endpoints to controller handlers.
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadResource: uploadPdf } = require('../middleware/uploadMiddleware');
const { uploadResource } = require('../controllers/resourceController');

const router = express.Router();

// POST /api/resources/upload - Upload a PDF academic resource
router.post('/upload', protect, uploadPdf, uploadResource);

module.exports = router;
