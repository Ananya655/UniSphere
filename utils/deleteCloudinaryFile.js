/**
 * Cloudinary Upload Cleanup
 * Removes orphaned files when validation or database insert fails.
 */

const { cloudinary } = require('../config/cloudinary');

/**
 * Delete an uploaded file from Cloudinary (best-effort cleanup).
 * @param {string|null} publicId - Cloudinary public_id from req.file.filename
 */
const deleteCloudinaryFile = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (error) {
    console.error('Failed to delete Cloudinary file:', publicId, error.message);
  }
};

module.exports = { deleteCloudinaryFile };
