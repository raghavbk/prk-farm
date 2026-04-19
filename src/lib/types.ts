export type Profile = {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
};

export type Tenant = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type TenantMember = {
  tenant_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
};

export type Group = {
  id: string;
  tenant_id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  ownership_pct: number;
};

export type Expense = {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  date: string;
  paid_by: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  user_id: string;
  share_pct: number;
  share_amount: number;
};

export type GroupBalance = {
  group_id: string;
  creditor_id: string;
  debtor_id: string;
  net_amount: number;
};

export type TenantSummary = {
  total_you_owe: number;
  total_owed_to_you: number;
};
