-- Tenant-scoped tags that can be applied to expenses.
-- Tags are created inline from the expense form and reused across any group
-- in the same tenant.

CREATE TABLE tags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#8899aa',
  created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tags_tenant_name_unique UNIQUE (tenant_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can view tags"
  ON tags FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "tenant members can create tags"
  ON tags FOR INSERT
  WITH CHECK (is_tenant_member(tenant_id) AND created_by = auth.uid());

-- Tag creator or any tenant admin can delete a tag.
CREATE POLICY "tag creator or admin can delete tags"
  ON tags FOR DELETE
  USING (created_by = auth.uid() OR is_tenant_owner(tenant_id));

-- Junction: which tags are on which expense.
CREATE TABLE expense_tags (
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (expense_id, tag_id)
);

ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;

-- Any tenant member who can see the group can read expense tags.
CREATE POLICY "expense tag visibility via group membership"
  ON expense_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   expenses e
      JOIN   groups   g ON g.id = e.group_id
      WHERE  e.id = expense_id
        AND  is_tenant_member(g.tenant_id)
    )
  );

-- Any tenant member can tag an expense (membership already verified in the
-- server action before we reach this point).
CREATE POLICY "tenant members can add expense tags"
  ON expense_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   expenses e
      JOIN   groups   g ON g.id = e.group_id
      WHERE  e.id = expense_id
        AND  is_tenant_member(g.tenant_id)
    )
  );

-- Expense creator or tenant admin can remove tags.
CREATE POLICY "expense creator or admin can remove expense tags"
  ON expense_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   expenses e
      JOIN   groups   g ON g.id = e.group_id
      WHERE  e.id = expense_id
        AND  (e.created_by = auth.uid() OR is_tenant_owner(g.tenant_id))
    )
  );
