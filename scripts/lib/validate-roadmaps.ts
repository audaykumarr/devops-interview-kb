import type { ValidateFunction } from "ajv";
import type { RawQuestionFile } from "./content";
import { extractHeadings } from "./content";

export interface RoadmapStageFrontmatter {
  id: string;
  title: string;
  prerequisites?: string[];
  categories: string[];
  technologies?: string[];
  related_guides?: string[];
  recommended_questions?: string[];
}

export interface RoadmapFrontmatter {
  id: string;
  title: string;
  description: string;
  target_role: string;
  estimated_duration_weeks?: number;
  stages: RoadmapStageFrontmatter[];
  status: "draft" | "published" | "deprecated";
  last_reviewed: string;
  last_updated: string;
  author?: string;
}

export interface RoadmapRecord {
  file: string;
  relFile: string;
  slug: string;
  data: RoadmapFrontmatter;
  body: string;
  sections: Map<string, string>;
}

export interface ValidationError {
  file: string;
  message: string;
}

export const REQUIRED_ROADMAP_SECTIONS = ["Introduction", "Who This Roadmap Is For", "Deferred Areas", "Related Guides"];

export const REQUIRED_STAGE_SUBSECTIONS = ["Why It Matters", "Learning Objectives", "Completion Criteria"];

const PLACEHOLDER_PATTERNS = [/\bTODO\b/i, /\bTBD\b/i, /\bFIXME\b/i, /lorem ipsum/i, /coming soon/i, /\bplaceholder\b/i];

function stageSectionHeading(stage: RoadmapStageFrontmatter): string {
  return `Stage: ${stage.title}`;
}

/** DFS cycle detection over a roadmap's own stage.prerequisites graph. Returns the first cycle found, as a list of stage ids, or null. */
function findPrerequisiteCycle(stages: RoadmapStageFrontmatter[]): string[] | null {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const state = new Map<string, "visiting" | "done">();

  function visit(id: string, path: string[]): string[] | null {
    const status = state.get(id);
    if (status === "done") return null;
    if (status === "visiting") return [...path, id];

    state.set(id, "visiting");
    const stage = byId.get(id);
    for (const prereqId of stage?.prerequisites ?? []) {
      const cycle = visit(prereqId, [...path, id]);
      if (cycle) return cycle;
    }
    state.set(id, "done");
    return null;
  }

  for (const stage of stages) {
    const cycle = visit(stage.id, []);
    if (cycle) return cycle;
  }
  return null;
}

/**
 * Validates every roadmap file's frontmatter against the JSON Schema plus the
 * cross-file and structural rules a schema alone can't express: id/stage-id
 * uniqueness, categories registered in taxonomy.json, recommended_questions
 * existing in the question corpus AND belonging to that stage's own category
 * pool, related_guides existing among known guides, prerequisites resolving
 * to real stages in the same roadmap with no cycles, required body sections
 * (roadmap-level and per-stage), and placeholder content.
 */
export function validateRoadmapCorpus(
  files: RawQuestionFile[],
  validateSchema: ValidateFunction,
  validCategories: Set<string>,
  questionCategoryById: Map<string, string>,
  validGuideIds: Set<string>,
): { errors: ValidationError[]; valid: RoadmapRecord[] } {
  const errors: ValidationError[] = [];
  const valid: RoadmapRecord[] = [];
  const seenIds = new Map<string, string>();

  for (const file of files) {
    const ok = validateSchema(file.data);
    if (!ok) {
      for (const err of validateSchema.errors ?? []) {
        errors.push({ file: file.relFile, message: `schema: ${err.instancePath || "(root)"} ${err.message ?? "invalid"}` });
      }
      continue;
    }

    const data = file.data as unknown as RoadmapFrontmatter;

    if (seenIds.has(data.id)) {
      errors.push({ file: file.relFile, message: `duplicate id "${data.id}", already used by ${seenIds.get(data.id)}` });
    } else {
      seenIds.set(data.id, file.relFile);
    }

    const seenStageIds = new Map<string, number>();
    for (const stage of data.stages) {
      seenStageIds.set(stage.id, (seenStageIds.get(stage.id) ?? 0) + 1);
    }
    for (const [stageId, count] of seenStageIds) {
      if (count > 1) errors.push({ file: file.relFile, message: `duplicate stage id "${stageId}" (appears ${count} times)` });
    }

    const stageIds = new Set(data.stages.map((s) => s.id));

    for (const stage of data.stages) {
      for (const category of stage.categories) {
        if (!validCategories.has(category)) {
          errors.push({
            file: file.relFile,
            message: `stage "${stage.id}" category "${category}" is not registered in schemas/taxonomy.json`,
          });
        }
      }

      for (const prereqId of stage.prerequisites ?? []) {
        if (!stageIds.has(prereqId)) {
          errors.push({
            file: file.relFile,
            message: `stage "${stage.id}" prerequisites references unknown stage id "${prereqId}"`,
          });
        }
      }

      for (const guideId of stage.related_guides ?? []) {
        if (!validGuideIds.has(guideId)) {
          errors.push({ file: file.relFile, message: `stage "${stage.id}" related_guides references unknown guide id "${guideId}"` });
        }
      }

      const stageCategorySet = new Set(stage.categories);
      for (const questionId of stage.recommended_questions ?? []) {
        const category = questionCategoryById.get(questionId);
        if (category === undefined) {
          errors.push({
            file: file.relFile,
            message: `stage "${stage.id}" recommended_questions references unknown question id "${questionId}"`,
          });
        } else if (!stageCategorySet.has(category)) {
          errors.push({
            file: file.relFile,
            message: `stage "${stage.id}" recommended_questions id "${questionId}" belongs to category "${category}", which is outside this stage's categories`,
          });
        }
      }
    }

    const cycle = findPrerequisiteCycle(data.stages);
    if (cycle) {
      errors.push({ file: file.relFile, message: `circular prerequisites: ${cycle.join(" -> ")}` });
    }

    for (const section of REQUIRED_ROADMAP_SECTIONS) {
      if (!file.sections.has(section)) {
        errors.push({ file: file.relFile, message: `missing required section "## ${section}"` });
        continue;
      }
      if ((file.sections.get(section) ?? "").length === 0) {
        errors.push({ file: file.relFile, message: `section "## ${section}" is empty` });
      }
    }

    for (const stage of data.stages) {
      const heading = stageSectionHeading(stage);
      const stageBody = file.sections.get(heading);
      if (stageBody === undefined) {
        errors.push({ file: file.relFile, message: `missing required section "## ${heading}" for stage "${stage.id}"` });
        continue;
      }
      if (stageBody.length === 0) {
        errors.push({ file: file.relFile, message: `section "## ${heading}" is empty` });
        continue;
      }
      const subsections = extractHeadings(stageBody, 3);
      for (const sub of REQUIRED_STAGE_SUBSECTIONS) {
        if (!subsections.has(sub)) {
          errors.push({ file: file.relFile, message: `stage "${stage.id}" is missing required sub-section "### ${sub}"` });
        } else if ((subsections.get(sub) ?? "").length === 0) {
          errors.push({ file: file.relFile, message: `stage "${stage.id}" sub-section "### ${sub}" is empty` });
        }
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

  return { errors, valid };
}
