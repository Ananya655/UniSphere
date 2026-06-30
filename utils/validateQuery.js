/**
 * Query Input Validation
 * Validates and sanitizes request body for creating academic queries.
 */

/**
 * Validate query creation payload.
 * @param {object} body - Request body
 * @returns {{ isValid: boolean, message?: string, errors?: string[], data?: object }}
 */
const validateQueryInput = (body) => {
    const errors = [];
  
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const queryBody = typeof body.body === 'string' ? body.body.trim() : '';
  
    if (!title) errors.push('Title is required');
    if (title && title.length < 5) errors.push('Title must be at least 5 characters');
    if (title && title.length > 255) errors.push('Title must not exceed 255 characters');
  
    if (!queryBody) errors.push('Body is required');
    if (queryBody && queryBody.length < 10) errors.push('Body must be at least 10 characters');
  
    if (errors.length > 0) {
      return {
        isValid: false,
        message: errors[0],
        errors,
      };
    }
  
    return {
      isValid: true,
      data: { title, body: queryBody },
    };
  };
  
  module.exports = { validateQueryInput };