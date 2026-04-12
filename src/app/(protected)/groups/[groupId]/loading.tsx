import { ViewTransition } from "react";

export default function GroupDetailLoading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto max-w-[1120px] px-8 py-10">
      <div>
        <div className="shimmer h-3 w-16 rounded" />
        <div className="shimmer mt-2 h-8 w-48 rounded-xl" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="shimmer h-4 w-20 rounded" />
          <div className="shimmer h-48 rounded-2xl" />
        </div>
        <div className="space-y-3">
          <div className="shimmer h-4 w-20 rounded" />
          <div className="shimmer h-20 rounded-2xl" />
          <div className="shimmer h-20 rounded-2xl" />
        </div>
      </div>
    </main>
    </ViewTransition>
  );
}
