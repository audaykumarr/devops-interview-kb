import type { FollowUpMatch } from "./content-gaps";
import type { QuestionRecord } from "./validate";

export interface FollowUpLink {
  source_id: string;
  follow_up: string;
  matched_id: string;
  matched_title: string;
  matched_url: string;
}

export function buildFollowUpLinks(records: QuestionRecord[], followUps: FollowUpMatch[]): FollowUpLink[] {
  const urlById = new Map(
    records.map((r) => [r.data.id, `/questions/${r.data.category}/${r.data.subcategory}/${r.slug}`]),
  );

  return followUps
    .filter((f): f is FollowUpMatch & { best_match: NonNullable<FollowUpMatch["best_match"]> } =>
      Boolean(f.status === "matched" && f.best_match),
    )
    .map((f) => ({
      source_id: f.source_id,
      follow_up: f.follow_up,
      matched_id: f.best_match.id,
      matched_title: f.best_match.title,
      matched_url: urlById.get(f.best_match.id) ?? "",
    }));
}
