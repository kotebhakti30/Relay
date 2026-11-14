import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extract, verified } from "./extract.js";

test("Extraction Accuracy: evaluates 3 distinct companies across Ownership, Decisions, and Blockers", async () => {
  const groundTruth = JSON.parse(readFileSync("test-fixtures/ground-truth.json", "utf8"));

  let totalExpected = 0;
  let totalMatched = 0;
  let totalVerifiable = 0;
  let categoryMatches = { Ownership: 0, Decisions: 0, Blockers: 0 };
  let categoryExpected = { Ownership: 0, Decisions: 0, Blockers: 0 };

  for (const companyData of groundTruth) {
    const { company, sourceText, expected } = companyData;
    const records = [
      {
        id: `REC-${company.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`,
        title: `${company} Note`,
        text: sourceText,
        recorded_at: new Date().toISOString(),
        visibility: "all",
      },
    ];

    const result = await extract(records);
    const claims = result.claims || result;

    for (const exp of expected) {
      totalExpected++;
      categoryExpected[exp.category]++;

      const matchedClaim = claims.find((c) => {
        if (c.category !== exp.category) return false;
        const text = (c.statement + " " + (Object.values(c.quotes || {})[0] || "")).toLowerCase();
        return exp.keywords.every((kw) => text.includes(kw.toLowerCase()));
      });

      if (matchedClaim) {
        totalMatched++;
        categoryMatches[exp.category]++;

        // Check owner if expected
        if (exp.expectedOwner) {
          assert.equal(
            matchedClaim.owner.toLowerCase(),
            exp.expectedOwner.toLowerCase(),
            `Expected owner ${exp.expectedOwner} for ${exp.category} in ${company}`
          );
        }

        // Verify that the quote appears verbatim in the source record
        const quote = Object.values(matchedClaim.quotes || {})[0] || matchedClaim.statement;
        if (quote && verified(records[0], quote)) {
          totalVerifiable++;
        }
      }
    }
  }

  const accuracy = (totalMatched / totalExpected) * 100;
  const verbatimRate = (totalVerifiable / totalMatched) * 100;

  console.log(`\n--- Extraction Accuracy Report ---`);
  console.log(`Evaluated ${groundTruth.length} diverse company contexts with ${totalExpected} target claims:`);
  console.log(`Total Matched: ${totalMatched}/${totalExpected} (${accuracy.toFixed(1)}%)`);
  console.log(`Ownership Accuracy: ${categoryMatches.Ownership}/${categoryExpected.Ownership} (${((categoryMatches.Ownership / categoryExpected.Ownership) * 100).toFixed(1)}%)`);
  console.log(`Decisions Accuracy: ${categoryMatches.Decisions}/${categoryExpected.Decisions} (${((categoryMatches.Decisions / categoryExpected.Decisions) * 100).toFixed(1)}%)`);
  console.log(`Blockers Accuracy: ${categoryMatches.Blockers}/${categoryExpected.Blockers} (${((categoryMatches.Blockers / categoryExpected.Blockers) * 100).toFixed(1)}%)`);
  console.log(`Verbatim Excerpt Verification Rate: ${totalVerifiable}/${totalMatched} (${verbatimRate.toFixed(1)}%)`);
  console.log(`-----------------------------------\n`);

  assert.ok(accuracy >= 85, `Overall accuracy must be at least 85%, got ${accuracy}%`);
  assert.equal(verbatimRate, 100, `Every extracted quote must be 100% verbatim verifiable in source text`);
});
