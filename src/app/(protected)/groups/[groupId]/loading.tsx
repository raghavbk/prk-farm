import { ViewTransition } from "react";

export default function GroupDetailLoading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div>
          <div className="h-4 w-16 rounded bg-border/50" />
          <div className="mt-2 h-7 w-44 rounded-lg bg-border/50" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-border/50" />
          <div className="h-14 rounded-xl bg-surface-warm" />
          <div className="h-14 rounded-xl bg-surface-warm" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-border/50" />
          <div className="h-12 rounded-xl bg-surface-warm" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-border/50" />
          <div className="h-16 rounded-xl bg-surface-warm" />
          <div className="h-16 rounded-xl bg-surface-warm" />
        </div>
      </div>
    </main>
    </ViewTransition>
  );
}
