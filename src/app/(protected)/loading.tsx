import { ViewTransition } from "react";

export default function Loading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-32 rounded-lg bg-border/50" />
        <div className="h-24 rounded-xl bg-surface-warm" />
        <div className="h-24 rounded-xl bg-surface-warm" />
        <div className="h-24 rounded-xl bg-surface-warm" />
      </div>
    </main>
    </ViewTransition>
  );
}
