"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createTagAction } from "@/actions/tags";
import type { Tag } from "@/lib/types";

const PRESET_COLORS = [
  { label: "Gold",       value: "#d4a853" },
  { label: "Sage",       value: "#7fb069" },
  { label: "Terracotta", value: "#c27564" },
  { label: "Sky",        value: "#6aaccc" },
  { label: "Lavender",   value: "#9b8ec4" },
  { label: "Rose",       value: "#cc8899" },
  { label: "Slate",      value: "#6e8ca0" },
  { label: "Sand",       value: "#a0916e" },
];

type Props = {
  tenantId: string;
  availableTags: Tag[];
  selectedTagIds?: string[];
};

export function TagPicker({ tenantId, availableTags, selectedTagIds = [] }: Props) {
  const [available, setAvailable] = useState<Tag[]>(availableTags);
  const [selected, setSelected] = useState<Tag[]>(
    availableTags.filter((t) => selectedTagIds.includes(t.id))
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newColor, setNewColor] = useState(PRESET_COLORS[0].value);
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setShowCreate(false);
        setCreateError(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const unselected = available.filter(
    (t) =>
      !selected.find((s) => s.id === t.id) &&
      t.name.toLowerCase().includes(query.toLowerCase())
  );
  const canCreate =
    query.trim().length > 0 &&
    !available.find((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  function select(tag: Tag) {
    setSelected((prev) => [...prev, tag]);
    setQuery("");
    setShowCreate(false);
    setCreateError(null);
    inputRef.current?.focus();
  }

  function remove(id: string) {
    setSelected((prev) => prev.filter((t) => t.id !== id));
  }

  function handleCreate() {
    setCreateError(null);
    startTransition(async () => {
      const result = await createTagAction(tenantId, query.trim(), newColor);
      if ("error" in result) {
        setCreateError(result.error);
        return;
      }
      setAvailable((prev) => {
        if (prev.find((t) => t.id === result.tag.id)) return prev;
        return [...prev, result.tag];
      });
      select(result.tag);
    });
  }

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Hidden inputs for form submission */}
      {selected.map((t) => (
        <input key={t.id} type="hidden" name="tagIds" value={t.id} />
      ))}

      <label className="section-label mb-2 block">Tags</label>

      {/* Selected chips + trigger */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "8px 10px",
          borderRadius: 12,
          border: "1px solid var(--rule-strong, #1c1c22)",
          background: "var(--surface-warm, #111114)",
          cursor: "text",
          minHeight: 42,
          alignItems: "center",
        }}
        onClick={() => setOpen(true)}
      >
        {selected.map((t) => (
          <span
            key={t.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 6px 3px 9px",
              borderRadius: 999,
              background: t.color + "22",
              border: `1px solid ${t.color}55`,
              color: t.color,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {t.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(t.id); }}
              aria-label={`Remove ${t.name}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 2px",
                color: t.color,
                fontSize: 14,
                lineHeight: 1,
                opacity: 0.7,
              }}
            >
              ×
            </button>
          </span>
        ))}
        <span
          style={{
            fontSize: 13,
            color: "var(--ink-3, #555)",
            paddingLeft: selected.length ? 2 : 4,
          }}
        >
          {selected.length === 0 ? "Add tags…" : "+"}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            borderRadius: 12,
            border: "1px solid var(--rule-strong, #1c1c22)",
            background: "var(--card, #111114)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Search input */}
          <div style={{ padding: "10px 10px 6px" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowCreate(false);
                setCreateError(null);
              }}
              placeholder="Search or type new tag…"
              style={{
                width: "100%",
                background: "var(--surface-warm, #0c0c0f)",
                border: "1px solid var(--rule, #1a1a20)",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 13,
                color: "var(--ink)",
                outline: "none",
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setOpen(false); setQuery(""); }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (canCreate) setShowCreate(true);
                  else if (unselected.length === 1) select(unselected[0]);
                }
              }}
            />
          </div>

          {/* Existing tags list */}
          {unselected.length > 0 && (
            <div style={{ maxHeight: 180, overflowY: "auto", padding: "4px 6px" }}>
              {unselected.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => select(t)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "7px 8px",
                    borderRadius: 8,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "var(--ink)",
                    fontSize: 13,
                    textAlign: "left",
                  }}
                  className="tag-option"
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: t.color,
                      flexShrink: 0,
                    }}
                  />
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {unselected.length === 0 && !canCreate && (
            <div
              style={{
                padding: "12px 14px",
                fontSize: 12,
                color: "var(--ink-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {query ? "No matching tags" : "No tags yet — type to create one"}
            </div>
          )}

          {/* Inline tag creator */}
          {canCreate && (
            <div
              style={{
                borderTop: unselected.length > 0 ? "1px solid var(--rule-2)" : "none",
                padding: "10px 10px 12px",
              }}
            >
              {!showCreate ? (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "7px 8px",
                    borderRadius: 8,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "var(--accent, #d4a853)",
                    fontSize: 13,
                    textAlign: "left",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  + Create &ldquo;{query.trim()}&rdquo;
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Pick a color for &ldquo;{query.trim()}&rdquo;
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        onClick={() => setNewColor(c.value)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: c.value,
                          border: newColor === c.value ? "2px solid var(--ink)" : "2px solid transparent",
                          cursor: "pointer",
                          flexShrink: 0,
                          boxShadow: newColor === c.value ? `0 0 0 3px ${c.value}44` : "none",
                          transition: "box-shadow 0.15s",
                        }}
                        aria-label={c.label}
                        aria-pressed={newColor === c.value}
                      />
                    ))}
                  </div>
                  {createError && (
                    <div style={{ fontSize: 12, color: "var(--neg, #e05c5c)" }}>{createError}</div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={isPending}
                      style={{
                        flex: 1,
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: "none",
                        background: "var(--accent, #d4a853)",
                        color: "#000",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isPending ? "wait" : "pointer",
                        opacity: isPending ? 0.7 : 1,
                      }}
                    >
                      {isPending ? "Creating…" : "Create tag"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCreate(false); setCreateError(null); }}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--rule)",
                        background: "none",
                        color: "var(--ink-3)",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .tag-option:hover { background: var(--surface-warm, #0c0c0f) !important; }
      `}</style>
    </div>
  );
}
