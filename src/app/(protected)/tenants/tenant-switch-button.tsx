"use client";

import { useFormStatus } from "react-dom";

export function TenantSwitchButton({
  isActive,
  name,
  role,
}: {
  isActive: boolean;
  name: string;
  role: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full card-surface card-hover p-4 text-left transition-opacity ${
        isActive ? "!border-olive bg-olive-wash" : ""
      } ${pending ? "opacity-60 cursor-wait" : ""}`}
    >
      <span className="font-medium text-ink">{name}</span>
      {isActive && (
        <span className="ml-2 rounded-full bg-olive/10 px-2 py-0.5 text-xs font-medium text-olive">
          Active
        </span>
      )}
      <span className="ml-2 text-xs text-ink-faint capitalize">
        {pending ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-ink-faint border-t-transparent animate-spin" />
            Switching…
          </span>
        ) : (
          role
        )}
      </span>
    </button>
  );
}
