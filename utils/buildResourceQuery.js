/**
 * Resource List Query Builder
 * Builds dynamic WHERE clauses and parameters for GET /api/resources.
 */

const VALID_TYPES = ['notes', 'pyq', 'reference', 'lab', 'assignment'];

/**
 * Parse an optional positive integer within a range.
 */
const parseOptionalIntInRange = (value, min, max) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { isValid: true, value: null };
  }

  const parsed = Number.parseInt(String(value).trim(), 10);

  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    return { isValid: false, value: null };
  }

  return { isValid: true, value: parsed };
};

/**
 * Parse and validate query parameters for resource listing.
 * @param {object} query - req.query
 * @returns {{ isValid: boolean, message?: string, filters?: object }}
 */
const parseResourceFilters = (query) => {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const branch = typeof query.branch === 'string' ? query.branch.trim() : '';
  const subject = typeof query.subject === 'string' ? query.subject.trim() : '';
  const type = typeof query.type === 'string' ? query.type.trim().toLowerCase() : '';

  const semesterResult = parseOptionalIntInRange(query.semester, 1, 8);
  if (!semesterResult.isValid) {
    return { isValid: false, message: 'Semester must be between 1 and 8' };
  }

  const yearResult = parseOptionalIntInRange(query.year, 1, 4);
  if (!yearResult.isValid) {
    return { isValid: false, message: 'Year must be between 1 and 4' };
  }

  if (type && !VALID_TYPES.includes(type)) {
    return {
      isValid: false,
      message: 'Type must be one of: notes, pyq, reference, lab, assignment',
    };
  }

  return {
    isValid: true,
    filters: {
      search,
      branch,
      semester: semesterResult.value,
      subject,
      type,
      year: yearResult.value,
    },
  };
};

/**
 * Build SQL WHERE clause and parameter array from parsed filters.
 * Only includes conditions for parameters that are present.
 * @param {object} filters - Parsed filter object
 * @returns {{ whereClause: string, params: Array }}
 */
const buildResourceWhereClause = (filters) => {
  const conditions = [];
  const params = [];

  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      '(resources.title LIKE ? OR resources.description LIKE ? OR subjects.name LIKE ?)'
    );
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (filters.branch) {
    conditions.push('resources.branch = ?');
    params.push(filters.branch);
  }

  if (filters.semester !== null) {
    conditions.push('resources.semester = ?');
    params.push(filters.semester);
  }

  if (filters.subject) {
    conditions.push('subjects.name = ?');
    params.push(filters.subject);
  }

  if (filters.type) {
    conditions.push('resources.type = ?');
    params.push(filters.type);
  }

  if (filters.year !== null) {
    conditions.push('resources.year = ?');
    params.push(filters.year);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return { whereClause, params };
};

module.exports = {
  parseResourceFilters,
  buildResourceWhereClause,
  VALID_TYPES,
};
