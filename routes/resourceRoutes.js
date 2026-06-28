/**
 * Resource Routes
 * Maps resource endpoints to controller handlers.
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadResource: uploadPdf } = require('../middleware/uploadMiddleware');
const { uploadResource, getResources } = require('../controllers/resourceController');

const router = express.Router();

// GET /api/resources - List resources with optional filters
router.get('/', getResources);

// POST /api/resources/upload - Upload a PDF academic resource
router.post('/upload', protect, uploadPdf, uploadResource);

module.exports = router;
