export type ShareablePageType = "question" | "guide" | "roadmap";

export const X_HANDLE = "@devopskb";

const TYPE_META: Record<ShareablePageType, { emoji: string; tagline: string }> = {
  question: { emoji: "", tagline: "Practical, scenario-driven DevOps interview preparation." },
  guide: { emoji: "📘", tagline: "A practical guide for DevOps interview preparation." },
  roadmap: { emoji: "🗺️", tagline: "A practical learning path for DevOps interview preparation." },
};

export interface ShareContentInput {
  type: ShareablePageType;
  title: string;
  /** Canonical absolute URL — never localhost or a tunnel URL. */
  url: string;
  /** Optional richer one-line hook for X (e.g. "Kubernetes interview prep: <question title>"), used instead of the generic tagline. */
  hook?: string;
}

function heading(type: ShareablePageType, title: string): string {
  const { emoji } = TYPE_META[type];
  return emoji ? `${emoji} ${title}` : title;
}

/** The full branded share text (Copy button, Web Share API `text` field) — title, one-line context, link, handle. */
export function buildShareText({ type, title, url }: ShareContentInput): string {
  const { tagline } = TYPE_META[type];
  return `${heading(type, title)}\n\n${tagline}\n\n🔗 ${url}\n\n${X_HANDLE}`;
}

const X_MAX_LENGTH = 280;
// X shortens any URL to a fixed-length t.co link for counting purposes, regardless of its real length.
const X_URL_WEIGHT = 23;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** X-optimized post text — shorter and punchier than buildShareText, since X rewards a single scroll-stopping line over a generic tagline. Falls back to the same heading/tagline shape when no hook is given (Guides, Roadmaps). */
export function buildXPostText(input: ShareContentInput): string {
  const { type, title, url, hook } = input;
  const { tagline } = TYPE_META[type];
  const scaffold = `\n\n🔗 ${url}\n\n${X_HANDLE}`;
  const fixedLength = X_URL_WEIGHT + X_HANDLE.length + (scaffold.length - url.length);

  if (hook) {
    const budget = Math.max(20, X_MAX_LENGTH - fixedLength);
    return `${truncate(hook, budget)}${scaffold}`;
  }

  const head = heading(type, title);
  const budget = Math.max(20, X_MAX_LENGTH - fixedLength - tagline.length - 2);
  return `${truncate(head, budget)}\n\n${tagline}${scaffold}`;
}

export function buildXIntentUrl(input: ShareContentInput): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(buildXPostText(input))}`;
}

/** A question's X hook reads as a direct, scroll-stopping prompt: "{Category} interview prep: {question}". */
export function buildQuestionHook(categoryName: string, title: string): string {
  return `${categoryName} interview prep: ${title}`;
}
