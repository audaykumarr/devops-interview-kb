import type { ValidateFunction } from "ajv";
import type { RawQuestionFile } from "./content";

export interface GuideFrontmatter {
  id: string;
  title: string;
  description: string;
  guide_type: "interview" | "learning" | "troubleshooting" | "preparation";
  category?: string;
  categories: string[];
  technologies?: string[];
  interview_levels: string[];
  estimated_reading_minutes: number;
  featured_questions?: string[];
  related_guides?: string[];
  related_technologies?: string[];
  status: "draft" | "published" | "deprecated";
  last_reviewed: string;
  last_updated: string;
  author?: string;
}

export interface GuideRecord {
  file: string;
  relFile: string;
  slug: string;
  data: GuideFrontmatter;
  body: string;
  sections: Map<string, string>;
}

export interface ValidationError {
  file: string;
  message: string;
}

export const REQUIRED_GUIDE_SECTIONS = [
  "Introduction",
  "Who This Guide Is For",
  "Prerequisites",
  "Learning / Interview Path",
  "Key Concepts",
  "Interview Focus",
  "Practice Questions",
  "Scenario & Troubleshooting Focus",
  "Common Mistakes",
  "Recommended Preparation Path",
  "Related Guides",
];

const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /lorem ipsum/i,
  /coming soon/i,
  /\bplaceholder\b/i,
];

/**
 * Validates every guide file's frontmatter against the JSON Schema plus the
 * cross-file and structural rules a schema alone can't express: id
 * uniqueness, category/categories registered in taxonomy.json,
 * featured_questions existing in the (guide-excluded) question corpus,
 * related_guides existing among guides and not self-referencing, required
 * body sections, and placeholder content.
 */
export function validateGuideCorpus(
  files: RawQuestionFile[],
  validateSchema: ValidateFunction,
  validCategories: Set<string>,
  validQuestionIds: Set<string>,
): { errors: ValidationError[]; valid: GuideRecord[] } {
  const errors: ValidationError[] = [];
  const valid: GuideRecord[] = [];
  const seenIds = new Map<string, string>();

  for (const file of files) {
    const ok = validateSchema(file.data);
    if (!ok) {
      for (const err of validateSchema.errors ?? []) {
        errors.push({
          file: file.relFile,
          message: `schema: ${err.instancePath || "(root)"} ${err.message ?? "invalid"}`,
        });
      }
      continue;
    }

    const data = file.data as unknown as GuideFrontmatter;

    if (seenIds.has(data.id)) {
      errors.push({ file: file.relFile, message: `duplicate id "${data.id}", already used by ${seenIds.get(data.id)}` });
    } else {
      seenIds.set(data.id, file.relFile);
    }

    const categoriesToCheck = [...(data.category ? [data.category] : []), ...data.categories];
    for (const category of categoriesToCheck) {
      if (!validCategories.has(category)) {
        errors.push({ file: file.relFile, message: `category "${category}" is not registered in schemas/taxonomy.json` });
      }
    }

    for (const questionId of data.featured_questions ?? []) {
      if (!validQuestionIds.has(questionId)) {
        errors.push({ file: file.relFile, message: `featured_questions references unknown question id "${questionId}"` });
      }
    }

    if ((data.related_guides ?? []).includes(data.id)) {
      errors.push({ file: file.relFile, message: `related_guides references its own id "${data.id}"` });
    }

    for (const section of REQUIRED_GUIDE_SECTIONS) {
      if (!file.sections.has(section)) {
        errors.push({ file: file.relFile, message: `missing required section "## ${section}"` });
        continue;
      }
      if ((file.sections.get(section) ?? "").length === 0) {
        errors.push({ file: file.relFile, message: `section "## ${section}" is empty` });
      }
    }

    for (const [heading, sectionBody] of file.sections) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(sectionBody)) {
          errors.push({ file: file.relFile, message: `section "## ${heading}" contains placeholder text matching ${pattern}` });
        }
      }
    }

    valid.push({ file: file.file, relFile: file.relFile, slug: file.slug, data, body: file.body, sections: file.sections });
  }

  for (const record of valid) {
    for (const relatedId of record.data.related_guides ?? []) {
      if (!seenIds.has(relatedId)) {
        errors.push({ file: record.relFile, message: `related_guides references unknown guide id "${relatedId}"` });
      }
    }
  }

  return { errors, valid };
}
