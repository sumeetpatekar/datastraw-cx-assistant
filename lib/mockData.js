// Mock CRM data. In production this would come from the CRM / order system,
// not from a static file. It's mocked here per the assessment instructions.

export const conversations = [
  {
    id: "conv_001",
    brand_id: "aqua_pure",
    customer: {
      name: "Priya Sharma",
      phone: "+91 98xxxxxx12",
    },
    order: {
      order_id: "AQ-10432",
      item: "AquaPure Glass Bottle (1L)",
      delivered_on: "2026-08-24", // 3 days ago -> inside refund window
      status: "Delivered",
    },
    history: [
      { sender: "customer", text: "Hi, I ordered a glass water bottle from you last week.", ts: "2026-08-25T09:12:00Z" },
      { sender: "customer", text: "My order was delivered but the bottle is broken. What can I do?", ts: "2026-08-25T09:12:40Z" },
    ],
  },
  {
    id: "conv_002",
    brand_id: "aqua_pure",
    customer: {
      name: "Ramesh Iyer",
      phone: "+91 98xxxxxx45",
    },
    order: {
      order_id: "AQ-09811",
      item: "AquaPure Steel Flask (750ml)",
      delivered_on: "2026-08-07", // 20 days ago -> outside refund window, guardrail test case
      status: "Delivered",
    },
    history: [
      { sender: "customer", text: "I received this 20 days ago. Can I get a refund? It's leaking now.", ts: "2026-08-27T07:40:00Z" },
    ],
  },
  {
    id: "conv_003",
    brand_id: "verdant_home",
    customer: {
      name: "Anjali Nair",
      phone: "+91 98xxxxxx78",
    },
    order: {
      order_id: "VH-55219",
      item: "Verdant Home Ceramic Planter (Set of 2)",
      delivered_on: "2026-08-26",
      status: "Delivered",
    },
    history: [
      { sender: "customer", text: "One of the planters in my set arrived cracked. Can I get a replacement instead of a refund?", ts: "2026-08-26T14:02:00Z" },
    ],
  },
];

export const brands = {
  aqua_pure: { id: "aqua_pure", name: "AquaPure", tagline: "Reusable hydration, done right." },
  verdant_home: { id: "verdant_home", name: "Verdant Home", tagline: "Everyday home goods, thoughtfully made." },
};
