"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { importExpenses, type ImportPayload, type ImportResult } from "@/actions/import";
import { I } from "@/components/ui/icons";

type Format = { id: string; label: string; description: string };

const FORMATS: Format[] = [
  { id: "json",  label: "JSON",  description: "Full backup · re-importable" },
  { id: "csv",   label: "CSV",   description: "Spreadsheet · Excel / Sheets" },
  { id: "xlsx",  label: "Excel", description: "Multi-sheet workbook" },
  { id: "pdf",   label: "PDF",   description: "Formatted report" },
];

type Props = { groupId: string };

export function ImportExportButtons({ groupId }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);
  const [open, setOpen]         = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult]     = useState<ImportResult | null>(null);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let payload: ImportPayload;
      try {
        payload = JSON.parse(ev.target?.result as string) as ImportPayload;
      } catch {
        setResult({ error: "Could not parse file — make sure it is a valid JSON export." });
        return;
      }
      startTransition(async () => {
        const res = await importExpenses(groupId, payload);
        setResult(res);
        if (fileRef.current) fileRef.current.value = "";
      });
    };
    reader.readAsText(file);
  }

  const isSuccess = result && "imported" in result;

  return (
    <div style={{ display: "contents" }}>
      {/* ── Export dropdown ─────────────────────────────── */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <I.download size={14} />
          Export
          <I.chevronD size={12} />
        </button>

        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 50,
              minWidth: 200,
              borderRadius: 12,
              border: "1px solid var(--rule-strong, #1c1c22)",
              background: "var(--card, #111114)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              overflow: "hidden",
              padding: "4px 0",
            }}
          >
            {FORMATS.map((fmt) => (
              <a
                key={fmt.id}
                role="menuitem"
                href={`/api/groups/${groupId}/export?format=${fmt.id}`}
                download
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "9px 14px",
                  textDecoration: "none",
                  gap: 2,
                  borderBottom: fmt.id !== "pdf" ? "1px solid var(--rule-2, #18181e)" : "none",
                }}
                className="export-option"
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                  {fmt.label}
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                  {fmt.description}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Import ──────────────────────────────────────── */}
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => { setResult(null); fileRef.current?.click(); }}
        disabled={isPending}
      >
        <I.upload size={14} />
        {isPending ? "Importing…" : "Import"}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {/* ── Result banner ───────────────────────────────── */}
      {result && (
        <div
          style={{
            width: "100%",
            marginTop: 4,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            border: "1px solid",
            borderColor: isSuccess
              ? "color-mix(in oklch, var(--pos) 30%, transparent)"
              : "color-mix(in oklch, var(--neg) 30%, transparent)",
            background: isSuccess
              ? "color-mix(in oklch, var(--pos) 8%, transparent)"
              : "color-mix(in oklch, var(--neg) 8%, transparent)",
            color: isSuccess ? "var(--pos)" : "var(--neg)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {"error" in result && <span>{result.error}</span>}
          {isSuccess && "imported" in result && (
            <>
              <span>
                Imported {result.imported} expense{result.imported !== 1 ? "s" : ""}
                {"skipped" in result && result.skipped > 0
                  ? `, skipped ${result.skipped} duplicate${result.skipped !== 1 ? "s" : ""}`
                  : ""}
                .
              </span>
              {"errors" in result && result.errors.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--ink-3)" }}>
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => setResult(null)}
            style={{
              alignSelf: "flex-end",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: 0,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <style>{`
        .export-option:hover { background: var(--surface-warm, #0c0c0f); }
      `}</style>
    </div>
  );
}
