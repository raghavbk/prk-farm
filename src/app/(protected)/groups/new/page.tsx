import { requireUserAndTenant } from "@/lib/auth";
import { ViewTransition } from "react";
import { CreateGroupForm } from "./create-group-form";

export default async function NewGroupPage() {
  const { user } = await requireUserAndTenant();

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Create Group</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Add members and set ownership percentages for expense splitting.
      </p>
      <CreateGroupForm currentUserId={user.id} />
    </main>
    </ViewTransition>
  );
}
