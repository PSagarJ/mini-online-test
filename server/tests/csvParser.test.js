const { test, describe } = require('node:test');
const assert = require('node:assert');
const { parseAndValidateQuestionsCsv } = require('../src/utils/csvParser');

describe('CSV Parsing & Validation', () => {
  test('successfully parses valid rows and quoted commas', () => {
    const csv = `question,option_a,option_b,option_c,option_d,correct,explanation
"What is 2 + 2, and 3 + 1?",4,5,6,7,A,"Both equal 4, a basic sum."
"Select the noun, adjective, and verb",Book,Blue,Run,Quickly,B,Blue is an adjective.
`;

    const result = parseAndValidateQuestionsCsv(csv);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.questions.length, 2);
    assert.strictEqual(result.questions[0].text, 'What is 2 + 2, and 3 + 1?');
    assert.strictEqual(result.questions[0].correctIndex, 0); // 'A' -> 0
    assert.strictEqual(result.questions[0].options[0], '4');
    assert.strictEqual(result.questions[1].correctIndex, 1); // 'B' -> 1
  });

  test('blocks the entire import if any single row is invalid', () => {
    const csv = `question,option_a,option_b,option_c,option_d,correct,explanation
Valid question 1,Alpha,Beta,Gamma,Delta,A,Valid explanation
Invalid question 2,Alpha,Alpha,Gamma,Delta,B,Duplicate options!
Valid question 3,Alpha,Beta,Gamma,Delta,C,Valid explanation
`;

    const result = parseAndValidateQuestionsCsv(csv);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.questions, undefined);
    assert.ok(result.errors.length >= 1);
    assert.strictEqual(result.errors[0].row, 3); // 2nd data row is row 3
    assert.match(result.errors[0].message, /distinct/i);
  });

  test('validates incorrect correct-letter', () => {
    const csv = `question,option_a,option_b,option_c,option_d,correct,explanation
Sample question,Opt1,Opt2,Opt3,Opt4,Z,Invalid correct letter
`;

    const result = parseAndValidateQuestionsCsv(csv);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.errors[0].row, 2);
    assert.match(result.errors[0].message, /must be A, B, C, or D/i);
  });
});
