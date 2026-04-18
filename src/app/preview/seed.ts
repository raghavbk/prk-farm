// Seed data for /preview/* routes. Matches design_handoff/data.jsx so the
// visual comparison is 1:1 with the reference HTML prototype.

export const MEMBERS = [
  { id: "u1", name: "Arjun Mehta", email: "arjun@farm.co", ownership_pct: 28 },
  { id: "u2", name: "Priya Shah", email: "priya@farm.co", ownership_pct: 22 },
  { id: "u3", name: "Dev Raman", email: "dev@farm.co", ownership_pct: 18 },
  { id: "u4", name: "Kavya Iyer", email: "kavya@farm.co", ownership_pct: 14 },
  { id: "u5", name: "Rohan Kapoor", email: "rohan@farm.co", ownership_pct: 10 },
  { id: "u6", name: "Ishita Varma", email: "ishita@farm.co", ownership_pct: 8 },
];

export const CURRENT_USER_ID = "u1";

export const GROUPS = [
  { id: "g1", name: "Crop Season 2026", memberIds: ["u1", "u2", "u3", "u4", "u5", "u6"], expenseCount: 18, total: 842500, myBalance: -1968, updatedLabel: "2 hours ago", tag: "active" as const },
  { id: "g2", name: "Land Development", memberIds: ["u1", "u2", "u3", "u4"], expenseCount: 9, total: 1245000, myBalance: -50988, updatedLabel: "yesterday", tag: "active" as const },
  { id: "g3", name: "Water & Electricity", memberIds: ["u1", "u2", "u3", "u4", "u5", "u6"], expenseCount: 24, total: 127800, myBalance: 320, updatedLabel: "4 days ago", tag: "recurring" as const },
  { id: "g4", name: "Equipment & Tools", memberIds: ["u1", "u2", "u3"], expenseCount: 6, total: 368400, myBalance: 8420, updatedLabel: "2 weeks ago", tag: "active" as const },
];

export const EXPENSES = [
  { id: "e1", group_id: "g1", description: "Organic seed procurement — Kharif", amount: 124500, date: "2026-04-16", paid_by: "u2" },
  { id: "e2", group_id: "g1", description: "Fertilizer shipment, Batch 3", amount: 68200, date: "2026-04-14", paid_by: "u1" },
  { id: "e3", group_id: "g2", description: "Fencing contractor — north plot", amount: 185000, date: "2026-04-13", paid_by: "u3" },
  { id: "e4", group_id: "g3", description: "Electricity bill — March", amount: 12850, date: "2026-04-10", paid_by: "u1" },
  { id: "e5", group_id: "g1", description: "Labor wages, week 2", amount: 42000, date: "2026-04-09", paid_by: "u4" },
  { id: "e6", group_id: "g4", description: "Drip irrigation repair kit", amount: 23400, date: "2026-04-07", paid_by: "u2" },
];

export function memberById(id: string) {
  return MEMBERS.find((m) => m.id === id)!;
}

export const SUMMARY = { totalYouOwe: 62591, totalOwedToYou: 9252 };

export const TENANT = { name: "Green Acres Collective", memberCount: 6 };
