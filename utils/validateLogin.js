/**
 * Login Input Validation
 * Validates and sanitizes user login request body.
 */

/**
 * Validate login payload.
 * @param {object} body - Request body
 * @returns {{ isValid: boolean, message?: string, errors?: string[], data?: object }}
 */
const validateLoginInput = (body) => {
  const errors = [];

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');

  if (errors.length > 0) {
    return {
      isValid: false,
      message: errors[0],
      errors,
    };
  }

  return {
    isValid: true,
    data: { email, password },
  };
};

module.exports = { validateLoginInput };
