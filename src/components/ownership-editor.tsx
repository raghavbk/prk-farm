"use client";

type Member = {
  userId: string;
  email: string;
  displayName: string;
  ownershipPct: number;
};

type Props = {
  members: Member[];
  onChange: (members: Member[]) => void;
};

export function OwnershipEditor({ members, onChange }: Props) {
  const total = members.reduce((sum, m) => sum + m.ownershipPct, 0);
  const isValid = Math.abs(total - 100) < 0.01;

  function handlePctChange(userId: string, value: string) {
    const pct = parseFloat(value) || 0;
    onChange(
      members.map((m) => (m.userId === userId ? { ...m, ownershipPct: pct } : m))
    );
  }

  function distributeEqually() {
    if (members.length === 0) return;
    const pct = Math.round((100 / members.length) * 100) / 100;
    const remainder = Math.round((100 - pct * members.length) * 100) / 100;
    onChange(
      members.map((m, i) => ({
        ...m,
        ownershipPct: i === 0 ? pct + remainder : pct,
      }))
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-ink-muted">
          Ownership percentages
        </label>
        {members.length > 0 && (
          <button
            type="button"
            onClick={distributeEqually}
            className="text-xs text-ink-faint hover:text-ink-muted underline"
          >
            Split equally
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">
          Add members first to set ownership
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-ink-muted truncate">
                {m.displayName}
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={m.ownershipPct || ""}
                  onChange={(e) => handlePctChange(m.userId, e.target.value)}
                  className="w-20 rounded-lg border border-border bg-surface-warm px-2 py-1 text-right text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-sm text-ink-faint">%</span>
              </div>
            </div>
          ))}

          <div
            className={`flex justify-end text-sm font-medium ${
              isValid ? "text-success" : "text-danger"
            }`}
          >
            Total: {total.toFixed(2)}%{" "}
            {isValid ? "" : "(must be 100%)"}
          </div>
        </div>
      )}
    </div>
  );
}
