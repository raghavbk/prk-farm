import { ViewTransition } from "react";

export default function GroupsLoading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="shimmer h-9 w-28" />
          <div className="shimmer h-4 w-56" />
        </div>
        <div className="shimmer h-11 w-32 rounded-xl" />
      </div>
      <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
      </div>
    </main>
    </ViewTransition>
  );
}
