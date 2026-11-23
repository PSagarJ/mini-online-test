const { parse } = require('csv-parse/sync');

const REQUIRED_HEADERS = [
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct',
  'explanation'
];

/**
 * Validates and parses question CSV string.
 * Limit: 500 rows, 1 MB max size.
 * Header row, exactly: question,option_a,option_b,option_c,option_d,correct,explanation
 * Parse with csv-parse so quoted commas work.
 * Each row needs a non-empty question, four distinct non-empty options, and a valid correct letter.
 */
function parseAndValidateQuestionsCsv(csvContent) {
  if (!csvContent || typeof csvContent !== 'string') {
    return {
      success: false,
      message: 'CSV content is empty or invalid.',
      errors: [{ row: 1, message: 'File is empty.' }]
    };
  }

  // Check 1MB size limit
  const byteLength = Buffer.byteLength(csvContent, 'utf8');
  if (byteLength > 1024 * 1024) {
    return {
      success: false,
      message: 'CSV file exceeds the maximum allowed size of 1 MB.',
      errors: [{ row: 1, message: 'File size exceeds 1 MB limit.' }]
    };
  }

  let records = [];
  try {
    records = parse(csvContent, {
      columns: (headers) => headers.map(h => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true
    });
  } catch (parseErr) {
    return {
      success: false,
      message: `Failed to parse CSV: ${parseErr.message}`,
      errors: [{ row: 1, message: `Syntax error: ${parseErr.message}` }]
    };
  }

  if (records.length === 0) {
    return {
      success: false,
      message: 'CSV file contains no data rows.',
      errors: [{ row: 1, message: 'No data rows found.' }]
    };
  }

  if (records.length > 500) {
    return {
      success: false,
      message: 'CSV file exceeds the maximum allowed limit of 500 rows.',
      errors: [{ row: 501, message: 'Row count exceeds 500 row maximum.' }]
    };
  }

  const errors = [];
  const validQuestions = [];
  const letterMap = { a: 0, b: 1, c: 2, d: 3 };

  records.forEach((record, idx) => {
    const rowNumber = idx + 2; // +1 for 1-based index, +1 for header row
    const rowErrors = [];

    const questionText = record['question'] ? record['question'].trim() : '';
    if (!questionText) {
      rowErrors.push('Question text cannot be empty');
    }

    const optA = record['option_a'] ? record['option_a'].trim() : '';
    const optB = record['option_b'] ? record['option_b'].trim() : '';
    const optC = record['option_c'] ? record['option_c'].trim() : '';
    const optD = record['option_d'] ? record['option_d'].trim() : '';

    if (!optA || !optB || !optC || !optD) {
      rowErrors.push('All four options (option_a, option_b, option_c, option_d) must be non-empty');
    }

    // Check distinct options
    const uniqueOptions = new Set([optA, optB, optC, optD]);
    if (uniqueOptions.size !== 4) {
      rowErrors.push('All four options must be distinct');
    }

    // Check correct answer letter
    const correctLetter = record['correct'] ? record['correct'].trim().toLowerCase() : '';
    if (!correctLetter || letterMap[correctLetter] === undefined) {
      rowErrors.push(`Correct option must be A, B, C, or D (received "${record['correct'] || ''}")`);
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNumber,
        message: rowErrors.join('. ')
      });
    } else {
      validQuestions.push({
        text: questionText,
        options: [optA, optB, optC, optD],
        correctIndex: letterMap[correctLetter],
        explanation: record['explanation'] ? record['explanation'].trim() : '',
        archived: false
      });
    }
  });

  if (errors.length > 0) {
    return {
      success: false,
      message: `Validation failed: ${errors.length} ${errors.length === 1 ? 'row contains' : 'rows contain'} errors. No rows were imported.`,
      errors
    };
  }

  return {
    success: true,
    questions: validQuestions
  };
}

module.exports = {
  REQUIRED_HEADERS,
  parseAndValidateQuestionsCsv
};
