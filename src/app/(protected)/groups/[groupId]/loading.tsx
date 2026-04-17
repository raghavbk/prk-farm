import { ViewTransition } from "react";

export default function GroupDetailLoading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="shimmer h-3 w-20" />
          <div className="shimmer h-9 w-48" />
        </div>
        <div className="flex gap-3">
          <div className="shimmer h-10 w-24 rounded-xl" />
          <div className="shimmer h-10 w-32 rounded-xl" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="shimmer h-4 w-16" />
            <div className="shimmer h-48 rounded-2xl" />
          </div>
          <div className="space-y-3">
            <div className="shimmer h-4 w-16" />
            <div className="shimmer h-20 rounded-2xl" />
          </div>
        </div>
        <div className="lg:col-span-3 space-y-3">
          <div className="shimmer h-4 w-20" />
          <div className="shimmer h-64 rounded-2xl" />
        </div>
      </div>
    </main>
    </ViewTransition>
  );
}
