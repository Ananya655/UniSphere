/**
 * Cloudinary Configuration
 * Creates and exports a configured Cloudinary v2 instance for file uploads.
 */

const cloudinary = require('cloudinary').v2;

/**
 * Check whether all required Cloudinary environment variables are set.
 * @returns {boolean}
 */
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_NAME &&
    process.env.CLOUDINARY_KEY &&
    process.env.CLOUDINARY_SECRET
  );
};

/**
 * Apply Cloudinary credentials from environment variables.
 * Called automatically when this module is imported.
 */
const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    console.warn(
      'Cloudinary credentials missing. Set CLOUDINARY_NAME, CLOUDINARY_KEY, and CLOUDINARY_SECRET in .env'
    );
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true,
  });
};

configureCloudinary();

module.exports = { cloudinary, isCloudinaryConfigured };
