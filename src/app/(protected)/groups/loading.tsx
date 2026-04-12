import { ViewTransition } from "react";

export default function GroupsLoading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-24 rounded-lg bg-border/50" />
          <div className="h-10 w-28 rounded-xl bg-surface-warm" />
        </div>
        <div className="h-16 rounded-xl bg-surface-warm" />
        <div className="h-16 rounded-xl bg-surface-warm" />
        <div className="h-16 rounded-xl bg-surface-warm" />
      </div>
    </main>
    </ViewTransition>
  );
}
