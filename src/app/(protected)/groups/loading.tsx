import { ViewTransition } from "react";

export default function GroupsLoading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="shimmer h-8 w-28 rounded-xl" />
        <div className="shimmer h-10 w-32 rounded-xl" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
      </div>
    </main>
    </ViewTransition>
  );
}
