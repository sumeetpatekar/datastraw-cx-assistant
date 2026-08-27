import { knowledgeBase } from "./knowledgeBase";

/**
 * Retrieve the most relevant knowledge base entries for a brand given the
 * customer's message.
 *
 * This is deliberately a simple keyword/overlap scorer rather than a vector
 * search. For a knowledge base of ~4 entries per brand, keyword matching is
 * fast, free, fully deterministic, and easy to debug -- which matters for a
 * guardrail system where you need to know *why* a piece of context was (or
 * wasn't) retrieved. At Datastraw's real scale (500 brands, large KBs per
 * brand) this function is the piece that gets swapped for embeddings +
 * Qdrant -- see the architecture doc. The interface (brandId, message) ->
 * entries[] stays the same either way, which is the point.
 */
export function retrieveContext(brandId, message, topK = 3) {
  const entries = knowledgeBase[brandId] || [];
  const text = message.toLowerCase();

  const scored = entries.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (text.includes(kw.toLowerCase())) score += 1;
    }
    return { entry, score };
  });

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.entry);

  // If nothing matched by keyword, fall back to returning the return +
  // refund policy, since those cover the majority of CX queries -- but we
  // mark it explicitly so the guardrail layer knows this was a fallback,
  // not a confident match.
  if (matched.length === 0) {
    return {
      entries: entries.filter((e) => e.topic === "return_policy" || e.topic === "refund_policy"),
      isFallback: true,
    };
  }

  return { entries: matched, isFallback: false };
}
