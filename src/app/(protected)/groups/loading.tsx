import { ViewTransition } from "react";

export default function GroupsLoading() {
  return (
    <ViewTransition exit="slide-down">
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 rounded bg-gray-200" />
          <div className="h-9 w-28 rounded-lg bg-gray-200" />
        </div>
        <div className="h-16 rounded-lg bg-gray-100" />
        <div className="h-16 rounded-lg bg-gray-100" />
        <div className="h-16 rounded-lg bg-gray-100" />
      </div>
    </main>
    </ViewTransition>
  );
}
