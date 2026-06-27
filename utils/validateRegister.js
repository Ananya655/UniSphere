/**
 * Registration Input Validation
 * Validates and sanitizes user registration request body.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_YEARS = ['1', '2', '3', '4'];

/**
 * Normalize current_year to a string enum value ('1'–'4').
 * Accepts numeric or string input.
 */
const normalizeCurrentYear = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const normalized = String(value).trim();
  return VALID_YEARS.includes(normalized) ? normalized : null;
};

/**
 * Validate registration payload.
 * @param {object} body - Request body
 * @returns {{ isValid: boolean, message?: string, errors?: string[], data?: object }}
 */
const validateRegisterInput = (body) => {
  const errors = [];

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const college = typeof body.college === 'string' ? body.college.trim() : '';
  const branch = typeof body.branch === 'string' ? body.branch.trim() : '';
  const currentYear = normalizeCurrentYear(body.current_year);

  if (!name) errors.push('Name is required');
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');
  if (!college) errors.push('College is required');
  if (!branch) errors.push('Branch is required');
  if (body.current_year === undefined || body.current_year === null || body.current_year === '') {
    errors.push('Current year is required');
  }

  if (email && !EMAIL_REGEX.test(email)) {
    errors.push('Email must be a valid email address');
  }

  if (password && password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (
    body.current_year !== undefined &&
    body.current_year !== null &&
    body.current_year !== '' &&
    !currentYear
  ) {
    errors.push('Current year must be between 1 and 4');
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
      name,
      email,
      password,
      college,
      branch,
      current_year: currentYear,
    },
  };
};

module.exports = { validateRegisterInput };
