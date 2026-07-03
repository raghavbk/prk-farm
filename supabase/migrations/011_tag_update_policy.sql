-- Allow tag creator or tenant admin to update a tag's name/color.
CREATE POLICY "tag creator or admin can update tags"
  ON tags FOR UPDATE
  USING (created_by = auth.uid() OR is_tenant_owner(tenant_id))
  WITH CHECK (is_tenant_member(tenant_id));
