import test from "node:test";
import assert from "node:assert/strict";
import { extract } from "./extract.js";
const note = (id, text, days = 0, visibility = "all") => ({
  id,
  text,
  visibility,
  type: "notes",
  recorded_at: new Date(Date.now() - days * 86400000),
});
const first = note("a", "Neha owns the nightly digest cron job.");
const confirmation = note(
  "b",
  "Neha confirmed she will own the nightly digest cron job after Aarav leaves.",
);
test("reconstruction preserves reviewed identity and tracks corroboration, unrelated notes and contradiction", async () => {
  const initial = (await extract([first])).claims[0];
  assert.equal(initial.evidence, "Insufficient Evidence");
  const reviewed = {
    ...initial,
    review: "Accepted",
    note: "Human review",
    resolution: "Verified by the reviewer.",
  };
  const other = note("u", "Neha owns the payment gateway.");
  const restricted = note(
    "s",
    "NEHA will own the nightly digest cron job.",
    0,
    "lead_only",
  );
  let result = (await extract([first, other, restricted], [reviewed])).claims;
  assert.deepEqual(result.find((c) => c.id === initial.id).refs, ["a"]);
  result = (await extract([first, confirmation, other, restricted], result))
    .claims;
  const c = result.find((c) => c.id === initial.id);
  assert.deepEqual(c.refs, ["a", "b"]);
  assert.equal(c.evidence, "Supported");
  assert.equal(c.owner, "Neha");
  assert.equal(c.quotes.b, confirmation.text);
  assert.equal(c.review, "Accepted");
  assert.equal(c.resolution, reviewed.resolution);
  assert.deepEqual(
    c.labelHistory.map((h) => h.label),
    ["Insufficient Evidence", "Supported"],
  );
  const disputed = (
    await extract(
      [
        first,
        confirmation,
        other,
        restricted,
        note("c", "Kabir owns the nightly digest cron job."),
      ],
      result,
    )
  ).claims.find((c) => c.id === initial.id);
  assert.equal(disputed.evidence, "Conflicting");
  assert.ok(!disputed.refs.includes("s"));
  assert.equal(disputed.resolution, c.resolution);
});
test("a stale note, repeated import or review alone cannot corroborate ownership", async () => {
  for (const second of [
    note("b", confirmation.text, 43),
    note("b", first.text),
  ]) {
    const { claims } = await extract([first, second]);
    assert.equal(claims[0].evidence, "Insufficient Evidence");
  }
});
