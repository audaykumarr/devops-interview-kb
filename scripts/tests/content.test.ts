import assert from "node:assert/strict";
import { test } from "node:test";
import { extractBulletList, extractHeadings } from "../lib/content";

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
