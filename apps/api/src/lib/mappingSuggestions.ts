export type MappingCandidate = {
  localProductId: string;
  localVariantId?: string | null;
  label: string;
  sourceText: string;
};

export type RankedSuggestion = {
  localProductId: string;
  localVariantId?: string | null;
  label: string;
  score: number;
};

function uniqueTokens(tokens: string[]) {
  return Array.from(new Set(tokens.filter(Boolean)));
}

function repairMojibakeTurkish(value: string) {
  return value
    .replace(/\u00e3\u00a7|\u00e3\u2021/g, "c") // ã§ / ã‡ => c
    .replace(/\u00e4\u00b1|\u00e4\u00b0/g, "i") // ä± / ä° => i
    .replace(/\u00e3\u00b6|\u00e3\u2013/g, "o") // ã¶ / ã– => o
    .replace(/\u00e5\u0178|\u00e5\u0161/g, "s") // åŸ / åš => s
    .replace(/\u00e3\u00bc|\u00e3\u0153/g, "u") // ã¼ / ãœ => u
    .replace(/\u00e4\u0178|\u00e4\u017e/g, "g"); // äŸ / äz => g
}

export function normalizeMatchText(value: string) {
  const lowered = (value ?? "").toLocaleLowerCase("tr");
  const repaired = repairMojibakeTurkish(lowered);

  return repaired
    .replace(/\u0131/g, "i")
    .replace(/\u00e7/g, "c")
    .replace(/\u011f/g, "g")
    .replace(/\u00f6/g, "o")
    .replace(/\u015f/g, "s")
    .replace(/\u00fc/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeMatchText(value: string) {
  const normalized = normalizeMatchText(value);
  if (!normalized) return [];
  return uniqueTokens(
    normalized
      .split(" ")
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
  );
}

function scoreByTokens(source: string[], target: string[]) {
  if (!source.length || !target.length) return 0;
  const sourceSet = new Set(source);
  const targetSet = new Set(target);

  const intersectionCount = source.filter((token) => targetSet.has(token)).length;
  const union = new Set([...sourceSet, ...targetSet]).size;
  if (!union) return 0;
  return intersectionCount / union;
}

export function scoreMatch(sourceText: string, targetText: string) {
  const source = normalizeMatchText(sourceText);
  const target = normalizeMatchText(targetText);

  if (!source || !target) return 0;
  if (source === target) return 1;

  let score = 0;
  if (source.includes(target) || target.includes(source)) {
    score = Math.max(score, 0.82);
  }

  const sourceTokens = tokenizeMatchText(source);
  const targetTokens = tokenizeMatchText(target);
  const tokenScore = scoreByTokens(sourceTokens, targetTokens);
  score = Math.max(score, tokenScore * 0.9);

  if (sourceTokens.length && targetTokens.length) {
    const firstSource = sourceTokens[0];
    const firstTarget = targetTokens[0];
    if (firstSource && firstTarget && firstSource === firstTarget) {
      score += 0.05;
    }
  }

  return Number(Math.min(1, score).toFixed(4));
}

export function rankMappingSuggestions(
  sourceText: string,
  candidates: MappingCandidate[],
  limit = 3,
  minScore = 0.25
): RankedSuggestion[] {
  const ranked = candidates
    .map((candidate) => ({
      localProductId: candidate.localProductId,
      localVariantId: candidate.localVariantId ?? null,
      label: candidate.label,
      score: scoreMatch(sourceText, candidate.sourceText)
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      score: Number(item.score.toFixed(4))
    }));

  return ranked;
}
