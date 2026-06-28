// Lantern v-next (M7) — data-quality gates, Great-Expectations-style.
//
// Evaluate an expectation suite over a dataset (array of row objects) and return the same
// PASS/FAIL gate shape the rest of the system speaks. Expectation names mirror GE's core set,
// so a suite authored here maps 1:1 onto a real GE suite when you graduate to the full engine.
const col = (rows, c) => rows.map((r) => r[c]);

export const EXPECTATIONS = {
  expect_column_values_to_not_be_null: (e, rows) => col(rows, e.column).filter((v) => v == null).length === 0,
  expect_column_values_to_be_between: (e, rows) => col(rows, e.column).every((v) => v >= e.min && v <= e.max),
  expect_column_values_to_be_in_set: (e, rows) => col(rows, e.column).every((v) => e.set.includes(v)),
  expect_column_values_to_be_unique: (e, rows) => new Set(col(rows, e.column)).size === rows.length,
  expect_column_values_to_match_regex: (e, rows) => { const re = new RegExp(e.regex); return col(rows, e.column).every((v) => re.test(String(v))); },
  expect_table_row_count_to_be_between: (e, rows) => rows.length >= e.min && rows.length <= e.max,
};

/**
 * @param {{name?, expectations: Array<{type, column?, ...}>}} suite
 * @param {Array<object>} rows
 * @returns {{status, success, total, results}}
 */
export function evaluateSuite(suite, rows = []) {
  const results = (suite.expectations || []).map((e) => {
    const fn = EXPECTATIONS[e.type];
    const success = fn ? !!fn(e, rows) : false;
    return { type: e.type, column: e.column ?? null, success, mitigation: success ? null : describe(e) };
  });
  const success = results.filter((r) => r.success).length;
  return { status: success === results.length ? "PASS" : "FAIL", success, total: results.length, results };
}

function describe(e) {
  switch (e.type) {
    case "expect_column_values_to_not_be_null": return `Remove or impute nulls in "${e.column}".`;
    case "expect_column_values_to_be_between": return `Bring "${e.column}" within [${e.min}, ${e.max}].`;
    case "expect_column_values_to_be_in_set": return `"${e.column}" has values outside the allowed set.`;
    case "expect_column_values_to_be_unique": return `"${e.column}" contains duplicates.`;
    case "expect_column_values_to_match_regex": return `"${e.column}" has values not matching ${e.regex}.`;
    case "expect_table_row_count_to_be_between": return `Row count must be in [${e.min}, ${e.max}].`;
    default: return `Unknown expectation "${e.type}".`;
  }
}
