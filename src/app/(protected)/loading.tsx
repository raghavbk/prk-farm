export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-32 rounded bg-gray-200" />
        <div className="h-24 rounded-lg bg-gray-100" />
        <div className="h-24 rounded-lg bg-gray-100" />
        <div className="h-24 rounded-lg bg-gray-100" />
      </div>
    </main>
  );
}
