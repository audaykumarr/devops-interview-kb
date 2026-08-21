const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "to", "of", "in", "on",
  "for", "and", "or", "with", "without", "how", "what", "why", "when", "would", "should", "could",
  "you", "your", "it", "its", "this", "that", "these", "those", "do", "does", "did", "if", "than",
  "then", "as", "at", "by", "from", "into", "not", "no", "but", "so", "such", "which", "who",
  "whom", "will", "can", "i", "we", "they", "he", "she", "also", "each", "any", "all", "one",
]);

/** Lowercases, strips code spans/punctuation, and drops stopwords + very short tokens. */
export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/`[^`]*`/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
