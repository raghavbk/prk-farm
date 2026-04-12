export default function GroupDetailLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div>
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="mt-2 h-6 w-40 rounded bg-gray-200" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-12 rounded-lg bg-gray-100" />
          <div className="h-12 rounded-lg bg-gray-100" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-10 rounded-lg bg-gray-100" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-16 rounded-lg bg-gray-100" />
          <div className="h-16 rounded-lg bg-gray-100" />
        </div>
      </div>
    </main>
  );
}
