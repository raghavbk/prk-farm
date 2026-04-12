import { ViewTransition } from "react";

export default function GroupsLoading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto max-w-[1120px] px-8 py-10">
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
