"use client";

import { useActionState } from "react";
import { onboardTenant, type OnboardActionState } from "@/actions/platform";
import { I } from "@/components/ui/icons";

export function OnboardForm({ platformApex }: { platformApex: string }) {
  const [state, formAction, pending] = useActionState<OnboardActionState, FormData>(
    onboardTenant,
    undefined,
  );

  // Bump the key on a successful onboard so React remounts the form and every
  // input resets to its default.
  const formKey = state?.ok ? `done-${state.tenantId}` : "idle";

  return (
    <form
      key={formKey}
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <Field label="Tenant name" hint="Shown in the ledger (e.g. 'Acme Farm').">
        <input
          name="name"
          required
          placeholder="Acme Farm"
          className="input-warm"
        />
      </Field>
      <Field label="Owner email" hint="First owner will receive a sign-up link.">
        <input
          type="email"
          name="owner_email"
          required
          placeholder="jane@acme.com"
          className="input-warm"
        />
      </Field>
      <Field label="Owner display name" hint="Optional. Falls back to the email handle.">
        <input name="owner_name" placeholder="Jane Doe" className="input-warm" />
      </Field>
      <Field
        label="Custom domain"
        hint={`Optional. Leave blank to auto-generate a <slug>.${platformApex} subdomain.`}
      >
        <input
          name="custom_domain"
          placeholder="farm.acme.com"
          className="input-warm mono"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </Field>

      {state?.ok === false && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--neg-wash)",
            color: "var(--neg)",
            border: "1px solid color-mix(in oklch, var(--neg) 20%, transparent)",
            fontSize: 13,
          }}
        >
          {state.error}
        </div>
      )}
      {state?.ok && <Success state={state} />}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-accent"
          style={{ height: 40 }}
        >
          {pending ? (
            <>
              <Spinner /> Onboarding…
            </>
          ) : (
            <>
              <I.plus size={14} /> Onboard tenant
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="eyebrow">{label}</span>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.4 }}>{hint}</span>
      )}
    </label>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 13,
        height: 13,
        borderRadius: "50%",
        border: "2px solid oklch(1 0 0 / 0.3)",
        borderTopColor: "white",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

function Success({
  state,
}: {
  state: Extract<NonNullable<OnboardActionState>, { ok: true }>;
}) {
  return (
    <div
      role="status"
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "var(--pos-wash)",
        border: "1px solid color-mix(in oklch, var(--pos) 20%, transparent)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--pos)", fontWeight: 500 }}>
        <I.check size={14} /> Tenant ready
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
        {state.inviteSent
          ? `Invite sent to ${state.ownerEmail}. The sign-up link lands on their tenant host (${state.primaryDomain}).`
          : `Owner ${state.ownerEmail} already existed — they were attached to the new tenant without re-sending an invite.`}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
        Primary domain:{" "}
        <span className="mono" style={{ color: "var(--ink)" }}>
          {state.primaryDomain}
        </span>
      </div>
      {state.fallbackDomain && (
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
          Fallback domain:{" "}
          <span className="mono" style={{ color: "var(--ink)" }}>
            {state.fallbackDomain}
          </span>
        </div>
      )}
      {state.cnameTarget && !state.primaryDomain.includes(".chukta.in") && (
        <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
          DNS step (custom domain): CNAME{" "}
          <code className="mono" style={{ color: "var(--ink-2)" }}>
            {state.primaryDomain}
          </code>{" "}
          →{" "}
          <code className="mono" style={{ color: "var(--ink-2)" }}>
            {state.cnameTarget}
          </code>
          , then add the domain to Vercel so SSL provisions.
        </div>
      )}
    </div>
  );
}
