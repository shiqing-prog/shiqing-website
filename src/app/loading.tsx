export default function Loading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      <p className="mt-3 text-sm text-gray-500">加载中…</p>
    </div>
  );
}
