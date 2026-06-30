/**
 * Discussion Input Validation
 * Validates and sanitizes request bodies for community forum posts and comments.
 */

const VALID_CATEGORIES = [
  'exam-prep',
  'subject',
  'internship',
  'placement',
  'other',
];

/**
 * Validate discussion post creation payload.
 * @param {object} body - Request body
 * @returns {{ isValid: boolean, message?: string, errors?: string[], data?: object }}
 */
const validateDiscussionPostInput = (body) => {
  const errors = [];

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const postBody = typeof body.body === 'string' ? body.body.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim().toLowerCase() : '';

  if (!title) errors.push('Title is required');
  if (title && title.length < 5) errors.push('Title must be at least 5 characters');
  if (title && title.length > 250) errors.push('Title must not exceed 250 characters');

  if (!postBody) errors.push('Body is required');
  if (postBody && postBody.length < 10) errors.push('Body must be at least 10 characters');

  if (!category) errors.push('Category is required');
  if (category && !VALID_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      message: errors[0],
      errors,
    };
  }

  return {
    isValid: true,
    data: { title, body: postBody, category },
  };
};

/**
 * Validate optional category filter for listing discussions.
 * @param {string|undefined} category - Query parameter value
 * @returns {{ isValid: boolean, message?: string, category?: string|null }}
 */
const validateDiscussionCategoryFilter = (category) => {
  if (category === undefined || category === null || category === '') {
    return { isValid: true, category: null };
  }

  const normalized = String(category).trim().toLowerCase();

  if (!VALID_CATEGORIES.includes(normalized)) {
    return {
      isValid: false,
      message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    };
  }

  return { isValid: true, category: normalized };
};

/**
 * Validate discussion comment creation payload.
 * @param {object} body - Request body
 * @returns {{ isValid: boolean, message?: string, errors?: string[], data?: object }}
 */
const validateDiscussionCommentInput = (body) => {
  const errors = [];

  const commentBody = typeof body.body === 'string' ? body.body.trim() : '';

  if (!commentBody) errors.push('Body is required');
  if (commentBody && commentBody.length < 10) {
    errors.push('Comment must be at least 10 characters');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      message: errors[0],
      errors,
    };
  }

  return {
    isValid: true,
    data: { body: commentBody },
  };
};

module.exports = {
  VALID_CATEGORIES,
  validateDiscussionPostInput,
  validateDiscussionCategoryFilter,
  validateDiscussionCommentInput,
};
