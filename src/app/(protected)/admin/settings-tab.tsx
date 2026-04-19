"use client";

export function SettingsTab({ tenantName }: { tenantName: string }) {
  const rows: { label: string; value: string; edit: boolean }[] = [
    { label: "Tenant name", value: tenantName, edit: false },
    { label: "Default currency", value: "INR (₹)", edit: false },
    { label: "Invite expiry", value: "7 days", edit: false },
    { label: "Audit log", value: "Enabled · immutable", edit: false },
  ];

  return (
    <div
      className="rise"
      style={{
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <style>{`
        .st-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
          padding: 16px 20px;
          align-items: center;
        }
        .st-row .st-edit { display: none; }
        @media (min-width: 768px) {
          .st-row {
            grid-template-columns: 200px 1fr auto;
            gap: 16px;
          }
          .st-row .st-edit { display: inline-flex; }
        }
      `}</style>

      {rows.map((r, i) => (
        <div
          key={r.label}
          className="st-row"
          style={{
            borderBottom: "1px solid var(--rule-2)",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>{r.label}</div>
          <div className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>
            {r.value}
          </div>
          {r.edit && (
            <button
              type="button"
              className="st-edit"
              style={{
                height: 28,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid var(--rule)",
                background: "transparent",
                color: "var(--ink-3)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Edit
            </button>
          )}
          {/* Keep grid stable even when no edit button shown */}
          {!r.edit && <span style={{ display: "none" }} aria-hidden />}
          {/* suppress unused i warning */}
          <span style={{ display: "none" }} aria-hidden data-i={i} />
        </div>
      ))}

      <div
        style={{
          padding: 20,
          borderTop: "1px solid var(--rule)",
          background: "var(--neg-wash)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--neg)", marginBottom: 4 }}>
          Danger zone
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.5 }}>
          Deleting the tenant removes all groups, expenses, and members permanently. This cannot be
          undone.
        </div>
        <button
          type="button"
          disabled
          style={{
            height: 34,
            padding: "0 14px",
            borderRadius: 8,
            border: "1px solid var(--neg)",
            background: "transparent",
            color: "var(--neg)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "not-allowed",
            opacity: 0.6,
          }}
          title="Not available in this preview"
        >
          Delete tenant…
        </button>
      </div>
    </div>
  );
}
