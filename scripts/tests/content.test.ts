import assert from "node:assert/strict";
import { test } from "node:test";
import { extractBulletList, extractHeadings, extractPreamble } from "../lib/content";

test("extractHeadings splits body by ## headings", () => {
  const body = "## Question\n\nWhat is X?\n\n## Short Answer\n\nY.\n";
  const sections = extractHeadings(body);
  assert.equal(sections.get("Question"), "What is X?");
  assert.equal(sections.get("Short Answer"), "Y.");
});

test("extractHeadings also accepts H1 headings", () => {
  const body = "# Title\n\nBody text.\n";
  const sections = extractHeadings(body);
  assert.equal(sections.get("Title"), "Body text.");
});

test("extractHeadings preserves multi-paragraph section content", () => {
  const body = "## Detailed Explanation\n\nPara one.\n\nPara two.\n\n## Key Takeaways\n\n- a\n- b\n";
  const sections = extractHeadings(body);
  assert.equal(sections.get("Detailed Explanation"), "Para one.\n\nPara two.");
  assert.equal(sections.get("Key Takeaways"), "- a\n- b");
});

test("extractHeadings is unaffected by CRLF line endings", () => {
  const body = "## Question\r\n\r\nWhat is X?\r\n\r\n## Short Answer\r\n\r\nY.\r\n";
  const sections = extractHeadings(body);
  assert.equal(sections.get("Question"), "What is X?");
  assert.equal(sections.get("Short Answer"), "Y.");
  assert.equal(sections.has("Question\r"), false);
});

test("extractBulletList parses markdown list items and ignores non-bullet lines", () => {
  const items = extractBulletList("- one\n- two\nNot a bullet\n- three\n\n- four");
  assert.deepEqual(items, ["one", "two", "three", "four"]);
});

test("extractBulletList returns an empty array for a section with no bullets", () => {
  assert.deepEqual(extractBulletList("Just a sentence, no list here."), []);
});

test("extractHeadings with level 3 splits by ### sub-headings instead of #/##", () => {
  const body = "Intro text.\n\n### Why It Matters\n\nBecause reasons.\n\n### Learning Objectives\n\n- a\n- b\n";
  const sections = extractHeadings(body, 3);
  assert.equal(sections.get("Why It Matters"), "Because reasons.");
  assert.equal(sections.get("Learning Objectives"), "- a\n- b");
});

test("extractHeadings default (level 2) behavior is unchanged when the level argument is omitted", () => {
  const body = "## Question\n\nWhat is X?\n\n## Short Answer\n\nY.\n";
  assert.deepEqual(extractHeadings(body), extractHeadings(body, 2));
});

test("extractPreamble returns the text before a section's first H3 sub-heading", () => {
  const body = "This stage covers containers.\n\n### Why It Matters\n\nBecause reasons.\n";
  assert.equal(extractPreamble(body), "This stage covers containers.");
});

test("extractPreamble returns the whole trimmed body when there are no H3 sub-headings", () => {
  assert.equal(extractPreamble("Just a plain description.\n"), "Just a plain description.");
});
