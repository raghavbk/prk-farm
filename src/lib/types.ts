export type Profile = {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
};

export type Tag = {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  created_by: string | null;
  created_at: string;
};
