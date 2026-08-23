import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import matter from "gray-matter";

export interface RawQuestionFile {
  file: string;
  relFile: string;
  slug: string;
  data: Record<string, unknown>;
  body: string;
  sections: Map<string, string>;
}

export function findMarkdownFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Splits a body into named sections keyed by heading text. Defaults to H1-or-H2
 * (question/guide top-level sections); pass level 3 to split H3 sub-sections
 * within an already-extracted H2 section body instead (used for Roadmap stage
 * sub-parts) — existing H1/H2 callers are unaffected since the default is unchanged.
 */
export function extractHeadings(body: string, level: 1 | 2 | 3 = 2): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = level === 3 ? /^###\s+(.+)$/.exec(line) : (/^#\s+(.+)$/.exec(line) ?? /^##\s+(.+)$/.exec(line));
    if (headingMatch) {
      if (currentHeading !== null) {
        sections.set(currentHeading, currentContent.join("\n").trim());
      }
      currentHeading = (headingMatch[1] ?? "").trim();
      currentContent = [];
    } else if (currentHeading !== null) {
      currentContent.push(line);
    }
  }
  if (currentHeading !== null) {
    sections.set(currentHeading, currentContent.join("\n").trim());
  }
  return sections;
}

/** The text before a section's first H3 sub-heading (a Roadmap stage's own description, ahead of its "### Why It Matters" etc. sub-parts). */
export function extractPreamble(sectionBody: string): string {
  return sectionBody.split(/^###\s+.+$/m)[0]!.trim();
}

/** Parses top-level "- item" markdown list lines out of a section body. */
export function extractBulletList(sectionBody: string): string[] {
  return sectionBody
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0);
}

function normalizeDateFields(data: Record<string, unknown>): void {
  for (const key of ["last_reviewed", "last_updated"]) {
    const value = data[key];
    // YAML auto-parses unquoted YYYY-MM-DD scalars as Date objects.
    if (value instanceof Date) {
      data[key] = value.toISOString().slice(0, 10);
    }
  }
}

export function loadQuestionFile(file: string, rootDir: string): RawQuestionFile {
  const raw = readFileSync(file, "utf-8").replace(/\r\n/g, "\n");
  const { data, content } = matter(raw);
  normalizeDateFields(data);
  return {
    file,
    relFile: relative(rootDir, file).replace(/\\/g, "/"),
    slug: basename(file, ".md"),
    data,
    body: content,
    sections: extractHeadings(content),
  };
}
