"use client";

import { useActionState, useState } from "react";
import { updateDisplayName, type ProfileActionResult } from "@/actions/profile";
import { I } from "@/components/ui/icons";

export function EditNameForm({ currentName }: { currentName: string }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ProfileActionResult, FormData>(
    updateDisplayName,
    undefined
  );

  if (state?.success && editing) setEditing(false);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Edit name"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--ink-3)",
          display: "inline-flex",
          alignItems: "center",
          marginLeft: 8,
          marginTop: 4,
          flexShrink: 0,
        }}
        className="edit-name-trigger"
      >
        <I.edit size={16} />
      </button>
    );
  }

  return (
    <form
      action={formAction}
      style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}
    >
      <input
        name="displayName"
        defaultValue={currentName}
        autoFocus
        maxLength={80}
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--rule)",
          borderRadius: 8,
          padding: "5px 10px",
          fontSize: 14,
          color: "var(--ink)",
          outline: "none",
          width: 200,
        }}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
      />
      <button
        type="submit"
        disabled={pending}
        className="btn btn-accent"
        style={{ padding: "5px 12px", fontSize: 12 }}
      >
        {pending ? "…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="btn btn-ghost"
        style={{ padding: "5px 10px", fontSize: 12 }}
      >
        Cancel
      </button>
      {state?.error && (
        <span style={{ fontSize: 12, color: "var(--neg)" }}>{state.error}</span>
      )}
    </form>
  );
}
