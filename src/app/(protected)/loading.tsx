import { ViewTransition } from "react";

export default function Loading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="shimmer h-4 w-24" />
          <div className="shimmer h-9 w-48" />
        </div>
        <div className="shimmer h-11 w-32 rounded-xl" />
      </div>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          <div className="shimmer h-4 w-20" />
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-3">
          <div className="shimmer h-4 w-28" />
          <div className="shimmer h-64 rounded-2xl" />
        </div>
      </div>
    </main>
    </ViewTransition>
  );
}
