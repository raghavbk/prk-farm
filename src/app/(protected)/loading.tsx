import { ViewTransition } from "react";

export default function Loading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto max-w-4xl px-6 py-8">
      {/* Hero shimmer */}
      <div className="shimmer h-32 rounded-2xl" />

      {/* Stat cards shimmer */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer col-span-2 h-32 rounded-2xl" />
      </div>

      {/* Quick actions shimmer */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="shimmer h-16 rounded-2xl" />
        <div className="shimmer h-16 rounded-2xl" />
      </div>

      {/* Groups shimmer */}
      <div className="mt-8 space-y-3">
        <div className="shimmer h-4 w-24 rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="shimmer h-24 rounded-2xl" />
          <div className="shimmer h-24 rounded-2xl" />
        </div>
      </div>
    </main>
    </ViewTransition>
  );
}
