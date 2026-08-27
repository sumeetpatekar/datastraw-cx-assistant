/**
 * Deterministic, code-level guardrails.
 *
 * The core idea: don't rely solely on the LLM to "remember" a policy number
 * correctly and apply it to a date. Compute the facts in code (which is
 * cheap, fast, and cannot hallucinate), and hand the *conclusion* to the
 * model as an explicit instruction, rather than hoping it does the date
 * arithmetic itself. The LLM's job is to phrase the answer well within the
 * boundary it's given -- not to decide the boundary.
 */

export function daysSince(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  const ms = now.getTime() - then.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Cross-checks the retrieved policy entries against the actual order to
 * flag cases where a confident answer would be unsafe -- e.g. a refund
 * request that falls outside the policy's stated day window.
 */
export function evaluateGuardrails({ entries, order, isFallback }) {
  const flags = [];
  const daysSinceDelivery = order?.delivered_on ? daysSince(order.delivered_on) : null;

  for (const entry of entries) {
    const windowDays = entry.facts?.window_days;
    if (windowDays != null && daysSinceDelivery != null) {
      if (daysSinceDelivery > windowDays) {
        flags.push({
          type: "outside_policy_window",
          policy: entry.topic,
          window_days: windowDays,
          days_since_delivery: daysSinceDelivery,
          message: `Customer is ${daysSinceDelivery} days past delivery. "${entry.topic}" only covers ${windowDays} days. Do not confidently promise this outcome -- flag for manager approval / offer next steps instead.`,
        });
      }
    }
  }

  if (isFallback) {
    flags.push({
      type: "low_confidence_retrieval",
      message:
        "No knowledge base entry matched the customer's message with confidence. The default return/refund policy was used as a best guess. Treat any specific claim with caution.",
    });
  }

  if (entries.length === 0) {
    flags.push({
      type: "no_context_available",
      message: "No relevant knowledge base entry was found at all. The model must not fabricate policy details.",
    });
  }

  return {
    flags,
    daysSinceDelivery,
    needsReview: flags.length > 0,
  };
}
