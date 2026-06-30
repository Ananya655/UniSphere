/**
 * Resource Upload Validation
 * Validates multipart form fields for resource uploads.
 */

const VALID_TYPES = ['notes', 'pyq', 'reference', 'lab', 'assignment'];

/**
 * Parse a positive integer from a string value.
 */
const parsePositiveInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number.parseInt(String(value).trim(), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

/**
 * Validate resource upload form fields (from req.body after multer parsing).
 * @param {object} body - Parsed multipart form body
 * @returns {{ isValid: boolean, message?: string, errors?: string[], data?: object }}
 */
const validateResourceUploadInput = (body) => {
  const errors = [];

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description =
    typeof body.description === 'string' && body.description.trim() !== ''
      ? body.description.trim()
      : null;
  const branch = typeof body.branch === 'string' ? body.branch.trim() : '';
  const type = typeof body.type === 'string' ? body.type.trim().toLowerCase() : '';

  const subjectId = parsePositiveInt(body.subject_id);
  const semester = parsePositiveInt(body.semester);
  const year = parsePositiveInt(body.year);

  if (!title) errors.push('Title is required');
  if (!body.subject_id && body.subject_id !== 0) errors.push('Subject is required');
  if (!branch) errors.push('Branch is required');
  if (!body.semester && body.semester !== 0) errors.push('Semester is required');
  if (!body.year && body.year !== 0) errors.push('Year is required');
  if (!type) errors.push('Type is required');

  if (body.subject_id !== undefined && body.subject_id !== null && body.subject_id !== '' && !subjectId) {
    errors.push('Subject must be a valid ID');
  }

  if (body.semester !== undefined && body.semester !== null && body.semester !== '' && semester === null) {
    errors.push('Semester must be a valid number');
  } else if (semester !== null && (semester < 1 || semester > 8)) {
    errors.push('Semester must be between 1 and 8');
  }

  if (body.year !== undefined && body.year !== null && body.year !== '' && year === null) {
    errors.push('Year must be a valid number');
  } else if (year !== null && (year < 1 || year > 4)) {
    errors.push('Year must be between 1 and 4');
  }

  if (type && !VALID_TYPES.includes(type)) {
    errors.push('Type must be one of: notes, pyq, reference');
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
    data: {
      title,
      description,
      subject_id: subjectId,
      branch,
      semester,
      year,
      type,
    },
  };
};

module.exports = { validateResourceUploadInput, VALID_TYPES };
