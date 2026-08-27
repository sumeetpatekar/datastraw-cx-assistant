// Mocked brand knowledge base.
// In production this would live in Postgres (+ pgvector/Qdrant for semantic
// retrieval) and be managed by the brand, not hardcoded. Each entry has a
// stable id, a topic used for keyword retrieval, and structured "facts" that
// let the guardrail layer reason deterministically (e.g. "7 days") instead
// of relying on the LLM to remember a number correctly.

export const knowledgeBase = {
  aqua_pure: [
    {
      id: "aq_return",
      topic: "return_policy",
      keywords: ["return", "broken", "damaged", "defect", "faulty", "exchange"],
      content:
        "AquaPure accepts returns for items that arrive damaged, defective, or broken within 10 days of delivery. The item must be unused beyond inspection. Customers should share a photo of the damage. Once approved, a replacement is shipped at no cost, or a refund is issued if the customer prefers.",
      facts: { window_days: 10, applies_to: "damaged_or_defective" },
    },
    {
      id: "aq_refund",
      topic: "refund_policy",
      keywords: ["refund", "money back", "reimburse"],
      content:
        "Refunds are only permitted within 7 days of delivery, and only for items that are unused and in original packaging, OR items confirmed as damaged/defective by support. Refunds outside this window are not processed automatically and require manager approval on a case-by-case basis. Refunds are credited to the original payment method within 5-7 business days of approval.",
      facts: { window_days: 7, applies_to: "refund" },
    },
    {
      id: "aq_shipping",
      topic: "shipping_policy",
      keywords: ["shipping", "delivery", "delayed", "tracking", "where is my order"],
      content:
        "Standard shipping takes 4-6 business days across India. Customers receive a tracking link by SMS and email once the order is dispatched. Delays beyond 8 business days should be escalated to the logistics partner.",
      facts: { standard_days_min: 4, standard_days_max: 6 },
    },
    {
      id: "aq_cancellation",
      topic: "cancellation_policy",
      keywords: ["cancel", "cancellation", "stop my order"],
      content:
        "Orders can be cancelled free of charge any time before they are dispatched. Once dispatched, the order cannot be cancelled but can be returned after delivery under the return policy.",
      facts: { cancellable_before: "dispatch" },
    },
  ],
  verdant_home: [
    {
      id: "vh_return",
      topic: "return_policy",
      keywords: ["return", "broken", "cracked", "damaged", "defect", "exchange", "replacement"],
      content:
        "Verdant Home offers free replacements for any item that arrives cracked, chipped, or damaged, within 14 days of delivery. Customers should share a photo. No return shipping is required for damaged items -- a replacement is dispatched directly.",
      facts: { window_days: 14, applies_to: "damaged_or_defective" },
    },
    {
      id: "vh_refund",
      topic: "refund_policy",
      keywords: ["refund", "money back"],
      content:
        "Refunds are available within 7 days of delivery for unopened items in original packaging. Damaged-on-arrival items are eligible for a refund at any point within the 14-day damage window instead of a replacement, if the customer prefers.",
      facts: { window_days: 7, applies_to: "refund" },
    },
    {
      id: "vh_shipping",
      topic: "shipping_policy",
      keywords: ["shipping", "delivery", "delayed", "tracking"],
      content:
        "Verdant Home ships within 5-8 business days. Fragile items (ceramics, glassware) are packed in double-layer protective packaging.",
      facts: { standard_days_min: 5, standard_days_max: 8 },
    },
    {
      id: "vh_cancellation",
      topic: "cancellation_policy",
      keywords: ["cancel", "cancellation"],
      content:
        "Orders can be cancelled within 2 hours of placing them. After that, the order enters packing and cannot be cancelled, but can be returned after delivery.",
      facts: { cancellable_within_hours: 2 },
    },
  ],
};
