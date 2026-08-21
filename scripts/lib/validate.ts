import type { ValidateFunction } from "ajv";
import type { RawQuestionFile } from "./content";

export interface QuestionFrontmatter {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  technologies: string[];
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  question_type: string[];
  tags: string[];
  estimated_time_minutes: number;
  companies?: string[];
  related_questions?: string[];
  status: "draft" | "published" | "deprecated";
  last_reviewed: string;
  last_updated: string;
  technology_version?: Record<string, string>;
  author?: string;
}

export interface QuestionRecord {
  file: string;
  relFile: string;
  slug: string;
  data: QuestionFrontmatter;
  body: string;
  sections: Map<string, string>;
}

export interface ValidationError {
  file: string;
  message: string;
}

const REQUIRED_SECTIONS = ["Question", "Short Answer", "Detailed Explanation", "Key Takeaways"];
const TROUBLESHOOTING_SECTIONS = ["Symptoms", "Possible Causes", "Investigation Steps", "Resolution"];
const ARCHITECTURE_SECTIONS = ["Requirements", "Architecture", "Trade-offs"];

const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /lorem ipsum/i,
  /coming soon/i,
  /\bplaceholder\b/i,
];

/**
 * Validates every file's frontmatter against the JSON Schema plus the
 * cross-file and structural rules that a schema alone can't express (id
 * uniqueness, related_questions integrity, required body sections per
 * question_type, placeholder content). Files that fail schema validation are
 * excluded from the returned `valid` list and from cross-file checks.
 */
export function validateCorpus(
  files: RawQuestionFile[],
  validateSchema: ValidateFunction,
  validCategories: Set<string>,
): { errors: ValidationError[]; valid: QuestionRecord[] } {
  const errors: ValidationError[] = [];
  const valid: QuestionRecord[] = [];
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

    const data = file.data as unknown as QuestionFrontmatter;

    if (seenIds.has(data.id)) {
      errors.push({
        file: file.relFile,
        message: `duplicate id "${data.id}", already used by ${seenIds.get(data.id)}`,
      });
    } else {
      seenIds.set(data.id, file.relFile);
    }

    if (!validCategories.has(data.category)) {
      errors.push({
        file: file.relFile,
        message: `category "${data.category}" is not registered in schemas/taxonomy.json`,
      });
    }

    const relatedQuestions = data.related_questions ?? [];
    if (relatedQuestions.includes(data.id)) {
      errors.push({ file: file.relFile, message: `related_questions references its own id "${data.id}"` });
    }

    const requiredForThisFile = [
      ...REQUIRED_SECTIONS,
      ...(data.question_type.includes("troubleshooting") ? TROUBLESHOOTING_SECTIONS : []),
      ...(data.question_type.includes("architecture") ? ARCHITECTURE_SECTIONS : []),
    ];

    for (const section of requiredForThisFile) {
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
          errors.push({
            file: file.relFile,
            message: `section "## ${heading}" contains placeholder text matching ${pattern}`,
          });
        }
      }
    }

    valid.push({
      file: file.file,
      relFile: file.relFile,
      slug: file.slug,
      data,
      body: file.body,
      sections: file.sections,
    });
  }

  for (const record of valid) {
    for (const relatedId of record.data.related_questions ?? []) {
      if (!seenIds.has(relatedId)) {
        errors.push({ file: record.relFile, message: `related_questions references unknown id "${relatedId}"` });
      }
    }
  }

  return { errors, valid };
}
