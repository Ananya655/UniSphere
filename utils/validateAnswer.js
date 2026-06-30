/**
 * Answer Input Validation
 * Validates and sanitizes request body for posting answers to queries.
 */

/**
 * Validate answer creation payload.
 * @param {object} body - Request body
 * @returns {{ isValid: boolean, message?: string, errors?: string[], data?: object }}
 */
const validateAnswerInput = (body) => {
    const errors = [];
  
    const answerBody = typeof body.body === 'string' ? body.body.trim() : '';
  
    if (!answerBody) errors.push('Body is required');
    if (answerBody && answerBody.length < 10) errors.push('Answer must be at least 10 characters');
  
    if (errors.length > 0) {
      return {
        isValid: false,
        message: errors[0],
        errors,
      };
    }
  
    return {
      isValid: true,
      data: { body: answerBody },
    };
  };
  
  module.exports = { validateAnswerInput };